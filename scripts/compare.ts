// 元の設計図（HTML の中の build() 関数）と、変換した JSON が同じブロックになるかを比べる。
//   npm run compare <元の .html か .js> <blueprints/…/xxx.json>
// build() は {x, y, z, t, d} の配列を返す関数であること（Claude の設計図アーティファクトでよく使う形）。
// 元のファイルは自分で作った設計図だけに使うこと（中の関数をそのまま実行する）。
import { readFileSync } from 'node:fs';
import { expand } from '../src/shared/expand';
import type { Blueprint } from '../src/shared/types';

interface Cell { x: number; y: number; z: number; t: string; d?: string }

/** "function build(){ ... }" を括弧の対応を数えて取り出す */
export function extractBuild(source: string): string {
  const start = source.search(/function\s+build\s*\(\s*\)\s*\{/);
  if (start < 0) throw new Error('function build() が見つかりません');
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('build() の終わりが見つかりません');
}

export function diffBlocks(a: Cell[], b: Cell[], limit = 20) {
  const key = (c: Cell) => `${c.x},${c.y},${c.z}`;
  const show = (c?: Cell) => (c ? `${c.t}${c.d ? `(${c.d})` : ''}` : '（なし）');
  const ma = new Map(a.map((c) => [key(c), c]));
  const mb = new Map(b.map((c) => [key(c), c]));
  const diffs: string[] = [];
  for (const k of new Set([...ma.keys(), ...mb.keys()])) {
    const x = ma.get(k), y = mb.get(k);
    if (x && y && x.t === y.t && (x.d ?? '') === (y.d ?? '')) continue;
    diffs.push(`  [${k}] 元: ${show(x)} / JSON: ${show(y)}`);
  }
  return { count: diffs.length, lines: diffs.slice(0, limit) };
}

if (process.argv[1]?.endsWith('compare.ts')) {
  const [src, json] = process.argv.slice(2);
  if (!src || !json) {
    console.error('使い方: npm run compare <元の .html か .js> <設計図 .json>');
    process.exit(2);
  }
  const build = new Function(`${extractBuild(readFileSync(src, 'utf8'))}; return build();`) as () => Cell[];
  const original = build();
  const converted = expand(JSON.parse(readFileSync(json, 'utf8')) as Blueprint);
  const { count, lines } = diffBlocks(original, converted);
  if (!count) {
    console.log(`✓ 同じです（${original.length}ブロック）`);
  } else {
    console.log(`✗ ${count}マス違います（元 ${original.length}ブロック / JSON ${converted.length}ブロック）`);
    console.log(lines.join('\n'));
    if (count > lines.length) console.log(`  …ほか ${count - lines.length}マス`);
    process.exit(1);
  }
}
