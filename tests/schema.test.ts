import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import { validateBlueprint } from '../src/shared/validate';
import { ROOT, listFiles, loadFile } from '../scripts/catalog';

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const schema = read('../schema/blueprint.schema.json');
const validateSchema = new Ajv({ allErrors: true, strict: false }).compile(schema);
const files = listFiles().map((f) => relative(ROOT, f));

// blueprints/ に置いた設計図は、JSON Schema とサイトの形式チェック（置き場所・ファイル名・版の一致を含む）を通ること
describe.each(files)('%s', (file) => {
  const bp = JSON.parse(readFileSync(`${ROOT}/${file}`, 'utf8'));
  it('JSON Schema を通る', () => {
    validateSchema(bp);
    expect(validateSchema.errors ?? []).toEqual([]);
  });
  it('サイトの形式チェックを通る', () => {
    const r = loadFile(`${ROOT}/${file}`);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });
});

it('設計図が1件以上ある', () => {
  expect(files.length).toBeGreaterThan(0);
});

describe('JSON Schema とサイトの形式チェックが同じものをはじく', () => {
  const base = { schemaVersion: 1, edition: 'bedrock', title: 't', palette: { a: { name: 'A', color: '#000000' } }, ops: [{ set: [0, 0, 0], t: 'a' }] };
  const cases: Record<string, unknown> = {
    知らない項目: { ...base, extra: 1 },
    版が違う: { ...base, edition: 'pe' },
    色の形: { ...base, palette: { a: { name: 'A', color: 'red' } } },
    ブロックなし: { schemaVersion: 1, edition: 'bedrock', title: 't', palette: base.palette },
    向き: { ...base, ops: [{ set: [0, 0, 0], t: 'a', d: 'X' }] },
    座標の範囲: { ...base, ops: [{ set: [0, 5000, 0], t: 'a' }] },
  };
  it.each(Object.entries(cases))('%s', (_, bp) => {
    expect(validateSchema(bp)).toBe(false);
    expect(validateBlueprint(bp).ok).toBe(false);
  });
});
