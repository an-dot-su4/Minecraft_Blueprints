import { ID_PATTERN, fail, json, r2Key, readBlueprint, safeEqual, sha256Hex, type Env } from '../../_lib/util';

type Fn = PagesFunction<Env, 'id'>;

interface Row { id: string; edition: 'bedrock' | 'java'; edit_key_hash: string; created_at: string; updated_at: string }

async function findRow(env: Env, id: unknown): Promise<Row | null> {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null;
  return env.DB.prepare('SELECT id, edition, edit_key_hash, created_at, updated_at FROM blueprints WHERE id = ?').bind(id).first<Row>();
}

async function checkEditKey(req: Request, row: Row): Promise<boolean> {
  const key = req.headers.get('x-edit-key') ?? '';
  return key.length > 0 && safeEqual(await sha256Hex(key), row.edit_key_hash);
}

/** 1件取得。URL（id）を知っていれば合言葉なしで見られる */
export const onRequestGet: Fn = async ({ params, env }) => {
  const row = await findRow(env, params.id);
  if (!row) return fail(404, '見つかりません');
  const obj = await env.BUCKET.get(r2Key(row.id));
  if (!obj) return fail(404, '見つかりません');
  return json({ id: row.id, edition: row.edition, blueprint: await obj.json(), createdAt: row.created_at, updatedAt: row.updated_at });
};

/** 更新（編集キーが必要）。版は変えられない */
export const onRequestPut: Fn = async ({ params, env, request }) => {
  const row = await findRow(env, params.id);
  if (!row) return fail(404, '見つかりません');
  if (!(await checkEditKey(request, row))) return fail(403, '編集用リンクが正しくありません');
  const r = await readBlueprint(request);
  if (r.error) return r.error;
  const bp = r.value;
  if (bp.edition !== row.edition) return fail(400, '版（edition）は変えられません');
  await env.BUCKET.put(r2Key(row.id), JSON.stringify(bp), { httpMetadata: { contentType: 'application/json' } });
  await env.DB.prepare(
    'UPDATE blueprints SET title = ?, summary = ?, author = ?, tags = ?, block_count = ?, updated_at = ? WHERE id = ?',
  ).bind(bp.title, bp.summary ?? '', bp.author ?? '', JSON.stringify(bp.tags ?? []), r.blockCount, new Date().toISOString(), row.id).run();
  return json({ id: row.id, edition: row.edition });
};

/** 削除（編集キーが必要） */
export const onRequestDelete: Fn = async ({ params, env, request }) => {
  const row = await findRow(env, params.id);
  if (!row) return fail(404, '見つかりません');
  if (!(await checkEditKey(request, row))) return fail(403, '編集用リンクが正しくありません');
  await env.DB.prepare('DELETE FROM blueprints WHERE id = ?').bind(row.id).run();
  await env.BUCKET.delete(r2Key(row.id));
  return json({ ok: true });
};
