# Minecraft_Blueprints

マイクラの設計図置き場。設計図を保存して、知り合いに URL で見せるためのサイトです。

- 設計図1件ごとに、素材表・3D表示・横から見た高さ・段ごとの配置図・作る順番を表示します
- 設計図は JSON で保存し、表示部分はサイトで共通です（[形式](schema/blueprint.schema.json) / [見本](blueprints/sky-trap-tower.json)）
- 統合版と Java 版を分けて管理します（URL は `/be/<id>` と `/je/<id>`）
- 一覧と投稿には合言葉が必要です。設計図の URL は知っている人だけが開けます（検索には出ません）

## 投稿のしかた

| 方法 | 状態 |
|---|---|
| JSON を貼る（Claude で作ったもの） | 使えます。頼み方は [docs/claude-prompt.md](docs/claude-prompt.md) |
| `.mcstructure` を読み込む（Windows 版で書き出したもの） | 準備中 |
| ブラウザで段ごとに描く（スマホ向け） | 準備中 |

投稿すると「編集用リンク」が出ます。あとで直したり消したりするときに使うので、人には送らずに保管してください。

## 構成

- 画面: Vite + TypeScript + three.js（`src/`）
- API: Cloudflare Pages Functions（`functions/`）
- 保存先: Cloudflare D1（一覧情報）と R2（設計図の JSON）
- 形式チェック: `src/shared/validate.ts`（画面とサーバーの両方で使用）と `schema/blueprint.schema.json`

公開までの手順は [docs/setup.md](docs/setup.md) を見てください。

## 開発

```sh
npm install
npm test          # 形式チェック・展開・素材数のテスト
npm run typecheck
npm run preview   # ビルドして http://localhost:8788 で起動（先に docs/setup.md の「手元で動かす」）
```
