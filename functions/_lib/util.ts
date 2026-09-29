import { validateBlueprint } from '../../src/shared/validate';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  /** 一覧と投稿に使う合言葉。Cloudflare の環境変数（シークレット）に入れる */
  SITE_PASSPHRASE?: string;
}

const MAX_BODY = 5 * 1024 * 1024;

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const fail = (status: number, error: string, errors?: string[]) => json(errors ? { error, errors } : { error }, status);

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 長さや内容で時間が変わらないように、ハッシュどうしを比べる */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

/** 合言葉が合っていなければエラーの Response を返す */
export async function requirePassphrase(req: Request, env: Env): Promise<Response | null> {
  if (!env.SITE_PASSPHRASE) return fail(500, '合言葉が設定されていません（SITE_PASSPHRASE）');
  const given = req.headers.get('x-passphrase') ?? '';
  if (!given || !(await safeEqual(given, env.SITE_PASSPHRASE))) return fail(403, '合言葉が違います');
  return null;
}

const ALPHABET = '0123456789abcdefghijkmnopqrstuvwxyz';
export function randomId(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  // 35文字から選ぶ。偏りを避けるため 245 以上は捨てて引き直す
  let out = '';
  let i = 0;
  while (out.length < len) {
    if (i >= bytes.length) { crypto.getRandomValues(bytes); i = 0; }
    const b = bytes[i++];
    if (b < 245) out += ALPHABET[b % 35];
  }
  return out;
}

export const ID_PATTERN = /^[0-9a-z]{10}$/;
export const r2Key = (id: string) => `blueprints/${id}.json`;

/** リクエスト本文を読んで形式チェックまでする */
export async function readBlueprint(req: Request) {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_BODY) return { error: fail(413, '設計図が大きすぎます（5MBまで）') };
  const text = await req.text();
  if (text.length > MAX_BODY) return { error: fail(413, '設計図が大きすぎます（5MBまで）') };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: fail(400, 'JSON として読めません') };
  }
  const r = validateBlueprint(parsed);
  if (!r.ok) return { error: fail(400, '設計図の形式に誤りがあります', r.errors) };
  return { value: r.value, blockCount: r.blockCount };
}
