import type { BlueprintSummary, Blueprint, Edition } from './shared/types';

/** サイトの基準パス（GitHub Pages では "/Minecraft_Blueprints/"、手元では "/"） */
export const BASE = import.meta.env.BASE_URL;

/** 基準パスからの相対パスを、サイト内の絶対パスにする */
export const url = (rel = '') => BASE + rel.replace(/^\//, '');

async function getJson<T>(rel: string): Promise<T | null> {
  const res = await fetch(url(rel));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`読み込めませんでした（${res.status}）`);
  return res.json();
}

export const loadIndex = async () => (await getJson<{ items: BlueprintSummary[] }>('data/index.json'))?.items ?? [];

export const loadBlueprint = (edition: Edition, slug: string) =>
  /^[a-z0-9-]+$/.test(slug) ? getJson<Blueprint>(`data/${edition}/${slug}.json`) : Promise.resolve(null);
