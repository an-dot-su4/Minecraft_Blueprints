import type { BlueprintSummary } from '../../../src/shared/types';
import { fail, json, r2Key, randomId, readBlueprint, requirePassphrase, sha256Hex, type Env } from '../../_lib/util';

interface Row {
  id: string; edition: 'bedrock' | 'java'; title: string; summary: string; author: string; tags: string;
  block_count: number; created_at: string; updated_at: string;
}

/** 一覧（合言葉が必要） */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await requirePassphrase(request, env);
  if (denied) return denied;
  const edition = new URL(request.url).searchParams.get('edition') ?? 'bedrock';
  if (edition !== 'bedrock' && edition !== 'java') return fail(400, 'edition は bedrock か java です');
  const { results } = await env.DB.prepare(
    `SELECT id, edition, title, summary, author, tags, block_count, created_at, updated_at
       FROM blueprints WHERE edition = ? ORDER BY updated_at DESC LIMIT 500`,
  ).bind(edition).all<Row>();
  const items: BlueprintSummary[] = results.map((r) => ({
    id: r.id, edition: r.edition, title: r.title, summary: r.summary, author: r.author,
    tags: JSON.parse(r.tags), blockCount: r.block_count, createdAt: r.created_at, updatedAt: r.updated_at,
  }));
  return json({ items });
};

/** 新しく投稿する（合言葉が必要）。編集キーはこのときだけ返す */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await requirePassphrase(request, env);
  if (denied) return denied;
  const r = await readBlueprint(request);
  if (r.error) return r.error;
  const bp = r.value;

  const id = randomId(10);
  const editKey = randomId(32);
  const now = new Date().toISOString();
  await env.BUCKET.put(r2Key(id), JSON.stringify(bp), { httpMetadata: { contentType: 'application/json' } });
  try {
    await env.DB.prepare(
      `INSERT INTO blueprints (id, edition, title, summary, author, tags, block_count, edit_key_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, bp.edition, bp.title, bp.summary ?? '', bp.author ?? '', JSON.stringify(bp.tags ?? []), r.blockCount, await sha256Hex(editKey), now, now).run();
  } catch (e) {
    await env.BUCKET.delete(r2Key(id));
    throw e;
  }
  return json({ id, edition: bp.edition, editKey }, 201);
};
