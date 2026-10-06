// blueprints/ の設計図を読み込んで確かめる処理。ビルド・npm run check・テストで共通に使う。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDITION_LIST, SLUG_PATTERN } from '../src/shared/editions';
import type { Blueprint, Edition } from '../src/shared/types';
import { validateBlueprint } from '../src/shared/validate';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const BLUEPRINTS_DIR = join(ROOT, 'blueprints');

export interface Entry {
  file: string;
  slug: string;
  edition: Edition;
  blueprint: Blueprint;
  blockCount: number;
  updatedAt: string;
}

export type LoadResult = { ok: true; entry: Entry } | { ok: false; file: string; errors: string[] };

export function listFiles(): string[] {
  const files: string[] = [];
  for (const ed of EDITION_LIST) {
    const dir = join(BLUEPRINTS_DIR, ed.id);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) if (f.endsWith('.json')) files.push(join(dir, f));
  }
  return files;
}

/** git の最後のコミット日時。コミット前ならファイルの更新日時 */
function updatedAt(file: string): string {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (out) return new Date(out).toISOString();
  } catch { /* git が使えない環境 */ }
  return statSync(file).mtime.toISOString();
}

export function loadFile(path: string): LoadResult {
  const file = resolve(path);
  const rel = relative(ROOT, file);
  const errors: string[] = [];
  const folder = basename(dirname(file));
  const slug = basename(file, '.json');

  if (relative(BLUEPRINTS_DIR, dirname(dirname(file))) !== '' || !EDITION_LIST.some((e) => e.id === folder))
    errors.push(`置き場所: blueprints/bedrock/ か blueprints/java/ の中に置いてください`);
  if (!SLUG_PATTERN.test(slug)) errors.push(`ファイル名: 英小文字・数字・ハイフンだけにしてください（例: sky-trap-tower.json）`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    return { ok: false, file: rel, errors: [...errors, `JSON として読めません: ${(e as Error).message}`] };
  }
  const r = validateBlueprint(parsed);
  if (!r.ok) return { ok: false, file: rel, errors: [...errors, ...r.errors] };
  if (r.value.edition !== folder) errors.push(`edition: フォルダ（${folder}）と JSON の edition（${r.value.edition}）が違います`);
  if (errors.length) return { ok: false, file: rel, errors };
  return { ok: true, entry: { file: rel, slug, edition: r.value.edition, blueprint: r.value, blockCount: r.blockCount, updatedAt: updatedAt(file) } };
}

export function loadAll(): LoadResult[] {
  return listFiles().map(loadFile);
}
