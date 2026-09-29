# CLAUDE.md

マイクラ設計図を保存・共有するサイト。利用者は日本語話者なので、画面の文言・ドキュメント・コミットメッセージは日本語で書く。

## 構成
- `src/shared/` : 画面と `functions/` の両方で使うコード（型、ops の展開、形式チェック、素材の集計）。DOM や Node の API を使わない
- `src/viewer/` : 設計図1件の表示（three.js の3D、SVG の側面図・配置図）
- `src/pages/` : 一覧・詳細・投稿/編集・合言葉。ルーティングは `src/main.ts`
- `functions/api/` : Cloudflare Pages Functions。D1（`DB`）に一覧情報、R2（`BUCKET`）に JSON 本体
- `blueprints/` : 見本の設計図。テストで JSON Schema と形式チェックの両方を通るか確かめている

## 決まりごと
- 設計図の形式を変えるときは `src/shared/types.ts`・`src/shared/validate.ts`・`schema/blueprint.schema.json`・`docs/claude-prompt.md` をそろえて直す
- 版（edition）ごとの違いは `src/shared/editions.ts` にまとめる
- 変更後は `npm run typecheck` と `npm test` を通す
