---
name: add-blueprint
description: マイクラの設計図をこのサイト（blueprints/ の JSON）に追加・更新する。「設計図を追加して」「この設計図をサイトに載せて」「〇〇の設計図を作って」と頼まれたとき、claude.ai の設計図アーティファクトの URL・設計図の HTML・JSON を渡されたとき、既存の設計図を直してと頼まれたときに使う。
---

# 設計図を追加・更新する

設計図は `blueprints/<edition>/<slug>.json` に置く。main に push すると GitHub Actions がサイトを作り直して公開する。
形式の詳しい説明は同じフォルダの [reference.md](reference.md)、見本は `blueprints/bedrock/sky-trap-tower.json`。

## 1. 入力を読む

| 渡されたもの | やること |
|---|---|
| claude.ai のアーティファクト URL | Artifact ツールの `read` で HTML を読む。ツールがなければ、HTML を貼るかファイルで渡してもらう |
| HTML（ファイル・貼り付け） | そのまま読む。`function build()` のような配置コード、素材表、手順の文章を探す |
| 設計図の JSON | そのまま使う（形式が違えば直す） |
| 言葉だけの説明 | 一から設計する。大きさ・高さ・向き・仕組みが決まらないところは、作る前にユーザーに聞く |
| 既存の設計図を直す | `blueprints/` から該当ファイルを探して読む |

## 2. 版とファイル名を決める

- **版**: 統合版なら `bedrock`、Java版なら `java`。入力に「統合版」「BE」「Switch」「スマホ」などがあれば bedrock、「Java」「JE」などがあれば java。どちらとも読めなければユーザーに聞く。
- **ファイル名（slug）**: 英小文字・数字・ハイフンで、内容が分かる短い英語（例: `sky-trap-tower`、`iron-farm-v2`）。`ls blueprints/*/` で既存のものと重ならないか確かめる。更新するときは同じ slug のまま。
- slug はそのまま URL になる（`be/<slug>/`）。一度公開したものは変えない。

## 3. JSON に変換する

[reference.md](reference.md) の形式どおりに書く。要点:

- ブロックは `ops`（`fill` / `walls` / `set` / `clear`）で置く。元のコードのループは、なるべく `fill`（箱で埋める）と `walls`（外周だけ）にまとめる。1個ずつの `set` を大量に並べない。
- 元のコードの種類名（`stone`, `slabB` など）は palette のキーにそのまま使う。変えると次の比較ができなくなる。
- 元の条件「すでにあれば置かない」（`if(!has(...))`）は `"keep": true`。最後にある `delete` は `clear`。
- 表示名・色・形・素材表の補足・手順・使い方の**文章は元のまま**移す。勝手に書き足したり言い換えたりしない。
- 元の HTML にある表示用の情報（視点、断面の範囲、横から見た図の見出し、高さの名前、立つ場所の印）も `views`・`sideView`・`layerNames`・`markers` に移す。
- 素材表の数は palette から自動で数える。`item` で同じ素材をまとめ、数えないもの（流れる水など）は `"count": false`。元の表にしかない数（はしごなど）は `materials.extra`。
- ブロックの JSON は、ops を1行1操作で書くと直しやすい（見本と同じ書き方）。

## 4. 確かめる

```sh
npm ci                                                    # 初回だけ
npm run check blueprints/<edition>/<slug>.json            # 形式のチェックと要約
npm run compare <元の .html か .js> blueprints/<edition>/<slug>.json   # 元に build() がある場合
```

- `check` のエラーがなくなるまで直す。要約（大きさ、素材の数、高さごとのブロック）が元の設計図や説明と合っているかも見る。
- 元の HTML に `build()` があるときは、アーティファクトから読んだ HTML をスクラッチ用の場所に保存して `compare` を実行し、**「同じです」になるまで**直す。違うマスの座標が出るので、そこの ops を見直す。
- 一から作った設計図は `check` の「高さごと」の表で、段ごとに意図どおりか確かめる。
- ブラウザが使える環境なら `npm run build && npx vite preview` で開き、3D と配置図を見てもよい。

## 5. 反映する

```sh
npm test
git add blueprints/<edition>/<slug>.json
git commit -m "設計図を追加: <タイトル>"     # 更新なら「設計図を更新: <タイトル>」
git push origin main
```

- テストが通ってから push する。main に直接 push してよいのは `blueprints/` の追加・更新だけ。サイトの仕組み（`src/` など）を変えるときはブランチを切って PR にする。
- 作業ブランチが指定されている環境では、そのブランチに push し、main への反映方法をユーザーに伝える。
- push のあと数分で公開される。ユーザーには次を伝える:
  - 公開 URL: `https://an-dot-su4.github.io/Minecraft_Blueprints/<be|je>/<slug>/`
  - 変換で判断したこと（版、slug、元と違う点があればその理由）
