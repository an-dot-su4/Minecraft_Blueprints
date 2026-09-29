import type { Blueprint, BlueprintSummary, Edition } from './shared/types';

const PASS_KEY = 'mcbp:passphrase';
const MINE_KEY = 'mcbp:mine';

// localStorage はプライベートブラウズなどで使えないことがあるので、失敗しても動くようにする
function load(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string | null) {
  try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* 保存できなくても続ける */ }
}

export const passphrase = {
  get: () => load(PASS_KEY),
  set: (v: string | null) => save(PASS_KEY, v),
};

/** この端末で投稿した設計図と編集キー */
export interface MineEntry { id: string; edition: Edition; title: string; editKey: string }

export const mine = {
  list(): MineEntry[] {
    try { return JSON.parse(load(MINE_KEY) ?? '[]'); } catch { return []; }
  },
  put(e: MineEntry) {
    save(MINE_KEY, JSON.stringify([e, ...mine.list().filter((m) => m.id !== e.id)]));
  },
  remove(id: string) {
    save(MINE_KEY, JSON.stringify(mine.list().filter((m) => m.id !== id)));
  },
  key(id: string) {
    return mine.list().find((m) => m.id === id)?.editKey;
  },
};

export class ApiError extends Error {
  constructor(public status: number, public messages: string[]) {
    super(messages.join('\n'));
  }
}

async function call<T>(path: string, init: RequestInit & { pass?: boolean; editKey?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');
  if (init.pass) headers.set('x-passphrase', passphrase.get() ?? '');
  if (init.editKey) headers.set('x-edit-key', init.editKey);
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.errors ?? [data.error ?? `エラーが起きました（${res.status}）`]);
  return data as T;
}

export interface StoredBlueprint {
  id: string;
  edition: Edition;
  blueprint: Blueprint;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  checkPass: (pass: string) =>
    call<{ ok: true }>('/api/auth', { method: 'POST', headers: { 'x-passphrase': pass } }),
  list: (edition: Edition) =>
    call<{ items: BlueprintSummary[] }>(`/api/blueprints?edition=${edition}`, { pass: true }),
  get: (id: string) => call<StoredBlueprint>(`/api/blueprints/${encodeURIComponent(id)}`),
  create: (bp: Blueprint) =>
    call<{ id: string; edition: Edition; editKey: string }>('/api/blueprints', { method: 'POST', body: JSON.stringify(bp), pass: true }),
  update: (id: string, editKey: string, bp: Blueprint) =>
    call<{ id: string; edition: Edition }>(`/api/blueprints/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(bp), editKey }),
  remove: (id: string, editKey: string) =>
    call<{ ok: true }>(`/api/blueprints/${encodeURIComponent(id)}`, { method: 'DELETE', editKey }),
};
