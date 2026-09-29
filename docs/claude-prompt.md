# Claude に設計図を作ってもらうとき

サイトに投稿できる設計図 JSON を Claude に作ってもらうための頼み方です。
下の「頼み方」をそのままコピーして、最後の `作りたいもの` を書き換えて送ってください。
できた JSON はサイトの「投稿する」に貼り付けると、下にプレビューが出ます。赤い文字が出たら、その文を Claude に貼って直してもらってください。

## 頼み方（コピー用）

````text
マインクラフトの設計図を、次の JSON 形式で作ってください。JSON だけをコードブロックで出してください。

# 形式
- 形式の定義: https://github.com/an-dot-su4/minecraft_blueprints/blob/main/schema/blueprint.schema.json
- 見本: https://github.com/an-dot-su4/minecraft_blueprints/blob/main/blueprints/sky-trap-tower.json
（読めない場合は下の説明に従ってください）

# ルール
- "schemaVersion": 1、"edition": 統合版なら "bedrock"、Java版なら "java"
- 座標は整数。x は東が +、z は南が +、y は上が +。基準（0,0,0）は分かりやすい場所に置く（例: 装置の中心の床）
- "palette" にブロックの種類を書く。キーは英数字の短い名前。各種類に
  name（日本語の名前）, color（"#rrggbb"）, 必要なら shape, label, item, count, mc を付ける
  - shape: box（普通のブロック）/ slabBottom / slabTop / carpet / trapdoor / torch / liquid（水源など）/ flowing（流れる水。置かないもの）
  - item: 素材表でまとめたい名前（例: 湧き床と壁を「建材ブロック」にまとめる）
  - count: false にすると素材表に数えない（流れる水など）
  - label: 配置図のマスに出す1〜2文字（例: ハーフの「下」「上」）
- "ops" でブロックを置く。上から順に適用し、後のものが上書きする
  - { "fill": [[x1,y1,z1],[x2,y2,z2]], "t": "種類" }  箱の中を全部埋める
  - { "walls": [[x1,y1,z1],[x2,y2,z2]], "t": "種類" }  各高さで外周だけ（筒や壁）
  - { "set": [x,y,z], "t": "種類", "d": "N" }  1つだけ置く。d は向き（N/S/E/W/U/D）。ホッパーの出口、トラップドアが付く側など
  - { "clear": [[x1,y1,z1],[x2,y2,z2]] }  消す（出入口の穴など）
  - fill / walls に "keep": true を付けると、すでに置いたブロックは上書きしない
- "layerNames": 高さごとの名前（例: { "-1": "ホッパー・チェスト" }）
- "markers": プレイヤーが立つ場所 { "pos": [x,y,z], "label": "待つ場所", "style": "solid" か "ghost" }
- "views": 3D の視点。{ "id", "label", "caption", "clip": { "x": [最小,最大] }（null で制限なし）, "exclude": [隠す種類], "camera": [x,y,z], "target": [x,y,z], "size": 画面に収める幅 }
- "sideView": 横から見た図。{ "slice": "x", "at": 0, "labels": [[高さ, "説明"]] }
- "notes": { "viewer", "side", "plan" } 各図の下に出す説明
- "materials": { "notes": { "素材名": "補足。{n}は個数、{n*5}は掛け算" }, "extra": [{ "name": "はしご", "count": "約45個〜", "note": "..." }] }
- "summary": 1〜3文の説明。"steps": 作る順番（Markdown の番号付きリスト）。"usage": 使い方（Markdown）
- 範囲は ±1024 まで、ブロックは合計30万個まで

# 作りたいもの
（例: 統合版の天空トラップタワー。演算距離4チャンク用、湧き層4段、待機部屋つき）
````

## うまくいかないとき

- **「palette にない種類」**: ops の `t` と palette のキーの綴りが違っています。
- **「知らない項目」**: 形式にない項目が入っています。消すか、正しい名前に直してもらってください。
- **形が思っていたのと違う**: プレビューの「段ごとの配置図」で1段ずつ確かめ、「高さ 5 の東側の壁が1マス足りない」のように具体的に伝えると直してもらいやすいです。
