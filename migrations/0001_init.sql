-- 一覧に出すための情報。設計図の JSON 本体は R2 の blueprints/<id>.json に置く
CREATE TABLE blueprints (
  id TEXT PRIMARY KEY,
  edition TEXT NOT NULL CHECK (edition IN ('bedrock', 'java')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  block_count INTEGER NOT NULL,
  edit_key_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX blueprints_edition_updated ON blueprints (edition, updated_at DESC);
