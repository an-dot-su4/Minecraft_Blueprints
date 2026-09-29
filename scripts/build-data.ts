// 設計図を確かめてから、サイトが読むデータを public/data/ に書き出す。
//   public/data/index.json               一覧
//   public/data/<edition>/<slug>.json    本体
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BlueprintSummary } from '../src/shared/types';
import { ROOT, loadAll } from './catalog';

const out = join(ROOT, 'public', 'data');
const results = loadAll();
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  for (const f of failed) if (!f.ok) console.error(`✗ ${f.file}\n${f.errors.map((e) => '  ・' + e).join('\n')}`);
  console.error(`\n${failed.length}件の設計図に誤りがあります。npm run check で確かめてください。`);
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
const items: BlueprintSummary[] = [];
for (const r of results) {
  if (!r.ok) continue;
  const { slug, edition, blueprint: bp, blockCount, updatedAt } = r.entry;
  mkdirSync(join(out, edition), { recursive: true });
  writeFileSync(join(out, edition, `${slug}.json`), JSON.stringify(bp));
  items.push({ id: slug, edition, title: bp.title, summary: bp.summary ?? '', author: bp.author ?? '', tags: bp.tags ?? [], blockCount, createdAt: updatedAt, updatedAt });
}
items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.json'), JSON.stringify({ items }));
console.log(`設計図 ${items.length}件を書き出しました`);
