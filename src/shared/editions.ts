import type { Edition } from './types';

// 版ごとの設定。設計図は blueprints/<id>/<slug>.json に置き、サイトでは /<slug の頭>/<slug>/ で開く。
export interface EditionInfo {
  id: Edition;
  /** URL の先頭 (be/<slug>/) */
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

/** 設計図ページのパス（サイトの基準 URL からの相対。例: "be/sky-trap-tower/"） */
export function blueprintPath(edition: Edition, slug: string): string {
  return `${EDITIONS[edition].slug}/${slug}/`;
}

/** 設計図ファイル名（拡張子なし）に使える形 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
