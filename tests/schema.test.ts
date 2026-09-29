import { readFileSync, readdirSync } from 'node:fs';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import { validateBlueprint } from '../src/shared/validate';

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const schema = read('../schema/blueprint.schema.json');
const validateSchema = new Ajv({ allErrors: true, strict: false }).compile(schema);
const files = readdirSync(new URL('../blueprints/', import.meta.url)).filter((f) => f.endsWith('.json'));

// blueprints/ に置いた設計図は、JSON Schema とサイトの形式チェックの両方を通ること
describe.each(files)('blueprints/%s', (file) => {
  const bp = read(`../blueprints/${file}`);
  it('JSON Schema を通る', () => {
    validateSchema(bp);
    expect(validateSchema.errors ?? []).toEqual([]);
  });
  it('サイトの形式チェックを通る', () => {
    const r = validateBlueprint(bp);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });
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
