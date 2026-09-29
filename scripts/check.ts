// 設計図を確かめて、内容の要約を出す。
//   npm run check                                     すべての設計図
//   npm run check blueprints/bedrock/xxx.json         指定したものだけ
import { bounds, expand } from '../src/shared/expand';
import { materials, stacks } from '../src/shared/materials';
import { listFiles, loadFile } from './catalog';

const args = process.argv.slice(2);
const files = args.length ? args : listFiles();
if (!files.length) {
  console.log('設計図がありません');
  process.exit(0);
}

let failed = 0;
for (const f of files) {
  const r = loadFile(f);
  if (!r.ok) {
    failed++;
    console.log(`✗ ${r.file}\n${r.errors.map((e) => '  ・' + e).join('\n')}\n`);
    continue;
  }
  const { file, blueprint: bp } = r.entry;
  const blocks = expand(bp);
  const b = bounds(blocks);
  console.log(`✓ ${file}  「${bp.title}」`);
  console.log(`  ブロック ${blocks.length}個 / 大きさ 東西${b.x1 - b.x0 + 1} × 高さ${b.y1 - b.y0 + 1} × 南北${b.z1 - b.z0 + 1}（x ${b.x0}〜${b.x1}, y ${b.y0}〜${b.y1}, z ${b.z0}〜${b.z1}）`);

  console.log('  素材:');
  for (const m of materials(bp, blocks)) console.log(`    ${m.item} ${m.count}個${m.count >= 64 ? `（${stacks(m.count)}）` : ''}${m.note ? ` … ${m.note}` : ''}`);
  for (const e of bp.materials?.extra ?? []) console.log(`    ${e.name} ${e.count}`);

  const unused = Object.keys(bp.palette).filter((t) => !blocks.some((bl) => bl.t === t));
  if (unused.length) console.log(`  ⚠ palette にあるが置かれていない種類: ${unused.join(', ')}`);

  console.log('  高さごと:');
  const perY = new Map<number, Record<string, number>>();
  for (const bl of blocks) {
    const row = perY.get(bl.y) ?? perY.set(bl.y, {}).get(bl.y)!;
    row[bl.t] = (row[bl.t] ?? 0) + 1;
  }
  for (const y of [...perY.keys()].sort((p, q) => p - q)) {
    const name = bp.layerNames?.[String(y)];
    const parts = Object.entries(perY.get(y)!).map(([t, n]) => `${t}×${n}`).join(' ');
    console.log(`    y=${String(y).padStart(4)}${name ? ` ${name}` : ''}: ${parts}`);
  }
  for (const v of bp.views ?? []) if (v.exclude?.some((t) => !bp.palette[t])) console.log(`  ⚠ views「${v.label}」の exclude に palette にない種類があります`);
  console.log('');
}

if (failed) {
  console.log(`${failed}件に誤りがあります`);
  process.exit(1);
}
