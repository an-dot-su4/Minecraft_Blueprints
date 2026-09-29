# CLAUDE.md

マイクラ設計図を GitHub Pages で公開する静的サイト。利用者は日本語話者なので、画面の文言・ドキュメント・コミットメッセージは日本語で書く。

## 設計図の追加・更新
`.claude/skills/add-blueprint/SKILL.md` の手順に従う。main に直接 push してよいのは `blueprints/` の追加・更新だけ。それ以外の変更はブランチを切って PR にする。

## 構成
- `blueprints/<edition>/<slug>.json` : 設計図。フォルダと JSON の `edition` を一致させる。slug はそのまま URL（`be/<slug>/`）になるので変えない
- `src/shared/` : 型、ops の展開、形式チェック、素材の集計。ブラウザと Node（scripts）の両方で使うので DOM や Node の API を使わない
- `src/viewer/` : 設計図1件の表示（three.js の3D、SVG の側面図・配置図）
- `src/pages/`, `src/main.ts` : 一覧と詳細。パスは `import.meta.env.BASE_URL`（`src/site.ts` の `url()`）を必ず通す
- `scripts/` : `build-data.ts`（public/data/ に書き出し）、`postbuild.ts`（設計図ごとの index.html と 404.html）、`check.ts`、`compare.ts`

## 決まりごと
- 設計図の形式を変えるときは `src/shared/types.ts`・`src/shared/validate.ts`・`schema/blueprint.schema.json`・`.claude/skills/add-blueprint/reference.md` をそろえて直す
- 変更後は `npm run typecheck` と `npm test` を通す
