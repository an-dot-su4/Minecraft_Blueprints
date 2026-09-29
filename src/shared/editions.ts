import type { Edition } from './types';

// 版ごとの設定。Java 版の読み込み・書き出しを足すときはここに追加する。
export interface EditionInfo {
  id: Edition;
  /** URL の先頭 (/be/<id>) */
  slug: string;
  label: string;
}

export const EDITIONS: Record<Edition, EditionInfo> = {
  bedrock: { id: 'bedrock', slug: 'be', label: '統合版' },
  java: { id: 'java', slug: 'je', label: 'Java版' },
};

export const EDITION_LIST = Object.values(EDITIONS);

export function editionFromSlug(slug: string): EditionInfo | undefined {
  return EDITION_LIST.find((e) => e.slug === slug);
}

export function blueprintPath(edition: Edition, id: string): string {
  return `/${EDITIONS[edition].slug}/${id}`;
}
