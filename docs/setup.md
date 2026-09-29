# 公開までの手順（Cloudflare Pages）

サイトは Cloudflare Pages で動かします。無料枠で足ります。
設計図の一覧情報は D1（データベース）、JSON 本体は R2（ファイル置き場）に保存します。

## 1. Cloudflare の準備（最初の1回だけ）

1. https://dash.cloudflare.com でアカウントを作る
2. このリポジトリで次を実行してログインする
   ```sh
   npm install
   npx wrangler login
   ```
3. D1 と R2 を作る
   ```sh
   npx wrangler d1 create minecraft-blueprints
   npx wrangler r2 bucket create minecraft-blueprints
   ```
   D1 を作ったときに出る `database_id` を `wrangler.toml` の `database_id` に貼り付けてコミットする。
   （R2 はダッシュボードで一度「R2 を有効にする」を押す必要がある場合があります）
4. テーブルを作る
   ```sh
   npm run db:migrate:remote
   ```

## 2. Pages のプロジェクトを作る

1. ダッシュボードの **Workers & Pages → 作成 → Pages → Git に接続** で `an-dot-su4/minecraft_blueprints` を選ぶ
2. ビルドの設定
   - フレームワーク: なし
   - ビルドコマンド: `npm run build`
   - 出力ディレクトリ: `dist`
3. 作成したプロジェクトの **設定 → 変数とシークレット** に、次を**シークレット**で追加する
   - `SITE_PASSPHRASE`: 知り合いに伝える合言葉（一覧を見るときと投稿するときに使う）
4. D1 と R2 のバインディングは `wrangler.toml` から読み込まれます。ダッシュボードの **設定 → バインディング** に `DB`（D1）と `BUCKET`（R2）が出ていることを確かめてください。
5. もう一度デプロイする（設定を変えたあとは再デプロイが必要）

これで `https://<プロジェクト名>.pages.dev` で開けます。`main` ブランチに push するたびに自動で公開されます。

## 3. 最初の設計図を入れる

1. サイトの「投稿する」を開いて合言葉を入れる
2. 「サンプルを入れる」を押すと天空トラップタワーが入るので、「投稿する」
3. 出てきた URL を知り合いに送る。**編集用リンクは自分だけで保管する**

## 手元で動かす

```sh
cp .dev.vars.example .dev.vars   # 合言葉は test-pass
npm run db:migrate:local
npm run preview                  # http://localhost:8788
```

画面だけを直しているときは、別のターミナルで `npm run preview` を動かしたまま `npm run dev` を使うと、保存するたびに画面が更新されます（API は 8788 番に転送されます）。

## 公開範囲について

- 設計図1件の URL（`/be/xxxxxxxxxx`）は、知っていれば合言葉なしで開けます。id はランダムな10文字なので推測されません。
- 一覧と投稿には合言葉が必要です。
- 全ページに `noindex` を付け、`robots.txt` でも検索エンジンを断っています。
- 合言葉を変えたいときは `SITE_PASSPHRASE` を書き換えて再デプロイします。すでに送った設計図の URL と編集用リンクはそのまま使えます。
