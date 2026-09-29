import { json, requirePassphrase, type Env } from '../_lib/util';

/** 合言葉が合っているかだけを確かめる */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  return (await requirePassphrase(request, env)) ?? json({ ok: true });
};
