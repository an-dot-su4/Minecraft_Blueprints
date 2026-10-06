// GitHub Pages はサーバー側で URL を書き換えられないので、設計図ごとに
// dist/<be|je>/<slug>/index.html を作り、直リンクやリロードでも開けるようにする。
// タイトルと説明もページごとに差し替える（リンクを送ったときのプレビュー用）。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EDITIONS } from '../src/shared/editions';
import { ROOT, loadAll } from './catalog';

const dist = join(ROOT, 'dist');
const template = readFileSync(join(dist, 'index.html'), 'utf8');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function page(title: string, description: string): string {
  return template
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(description)}">`);
}

let n = 0;
for (const r of loadAll()) {
  if (!r.ok) continue;
  const { slug, edition, blueprint: bp } = r.entry;
  const dir = join(dist, EDITIONS[edition].slug, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), page(bp.title, bp.summary ?? ''));
  n++;
}
// 知らない URL は一覧の画面から「見つかりません」を出す
writeFileSync(join(dist, '404.html'), page('ページがありません', ''));
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`設計図ページを ${n}件作りました`);
