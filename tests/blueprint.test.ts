import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { expand } from '../src/shared/expand';
import { fillNote, materials, stacks } from '../src/shared/materials';
import type { Blueprint } from '../src/shared/types';
import { validateBlueprint } from '../src/shared/validate';
// @ts-expect-error JS のまま置いている比較用の元コード
import { build } from './fixtures/original-build.js';

const sample = JSON.parse(readFileSync(new URL('../blueprints/sky-trap-tower.json', import.meta.url), 'utf8')) as Blueprint;
const sortKey = (b: { x: number; y: number; z: number }) => `${b.x},${b.y},${b.z}`;
const norm = (list: { x: number; y: number; z: number; t: string; d?: string }[]) =>
  list.map((b) => ({ x: b.x, y: b.y, z: b.z, t: b.t, d: b.d ?? null })).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

describe('天空トラップタワー', () => {
  it('元の HTML の build() と同じブロックに展開される', () => {
    expect(norm(expand(sample))).toEqual(norm(build()));
  });

  it('形式チェックを通る', () => {
    const r = validateBlueprint(sample);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });

  it('素材の数が元の設計図と同じ', () => {
    const rows = materials(sample, expand(sample));
    const byItem = Object.fromEntries(rows.map((r) => [r.item, r]));
    expect(byItem['ホッパー'].count).toBe(10);
    expect(byItem['ホッパー'].note).toBe('鉄インゴット50個');
    expect(byItem['チェスト'].count).toBe(2);
    expect(byItem['水源'].count).toBe(6);
    expect(byItem['松明'].count).toBe(6);
    expect(byItem['カーペット'].count).toBe(9);
    expect(byItem['木のトラップドア'].count).toBe(64);
    expect(byItem['ハーフブロック'].note).toMatch(/^下付き\d+・上付き\d+$/);
    expect(rows.map((r) => r.item)).not.toContain('流れる水（置かない）');
  });
});

describe('expand', () => {
  it('walls は外周だけで、keep は既存を上書きしない', () => {
    const blocks = expand({
      ops: [
        { set: [0, 0, 0], t: 'a' },
        { walls: [[-1, 0, -1], [1, 0, 1]], t: 'b' },
        { set: [1, 0, 1], t: 'c' },
        { walls: [[-1, 0, -1], [1, 1, 1]], t: 'd', keep: true },
      ],
    });
    const at = (x: number, y: number, z: number) => blocks.find((b) => b.x === x && b.y === y && b.z === z)?.t;
    expect(at(0, 0, 0)).toBe('a');
    expect(at(1, 0, 1)).toBe('c');
    expect(at(-1, 0, 0)).toBe('b');
    expect(at(-1, 1, 0)).toBe('d');
    expect(at(0, 1, 0)).toBeUndefined();
  });

  it('clear で消える', () => {
    expect(expand({ ops: [{ fill: [[0, 0, 0], [2, 0, 0]], t: 'a' }, { clear: [[1, 0, 0], [1, 0, 0]] }] })).toHaveLength(2);
  });
});

describe('validateBlueprint', () => {
  const base = { schemaVersion: 1, edition: 'bedrock', title: 't', palette: { a: { name: 'A', color: '#000000' } }, ops: [{ set: [0, 0, 0], t: 'a' }] };

  it('最小の設計図を通す', () => {
    expect(validateBlueprint(base).ok).toBe(true);
  });

  it('palette にない種類や知らない項目をはじく', () => {
    const r = validateBlueprint({ ...base, ops: [{ set: [0, 0, 0], t: 'zzz' }], foo: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join('\n')).toContain('zzz');
      expect(r.errors.join('\n')).toContain('foo');
    }
  });

  it('大きすぎる範囲をはじく', () => {
    const r = validateBlueprint({ ...base, ops: [{ fill: [[-1000, -1000, -1000], [1000, 1000, 1000]], t: 'a' }] });
    expect(r.ok).toBe(false);
  });

  it('版は bedrock か java だけ', () => {
    expect(validateBlueprint({ ...base, edition: 'pe' }).ok).toBe(false);
    expect(validateBlueprint({ ...base, edition: 'java' }).ok).toBe(true);
  });
});

describe('materials helpers', () => {
  it('fillNote', () => {
    expect(fillNote('鉄{n*5}・{a}・{zz}', 3, { a: 7 })).toBe('鉄15・7・{zz}');
  });
  it('stacks', () => {
    expect(stacks(5)).toBe('5個');
    expect(stacks(64)).toBe('1スタック');
    expect(stacks(130)).toBe('2スタック＋2');
  });
});
