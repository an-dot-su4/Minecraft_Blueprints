# 設計図 JSON の形式

正式な定義は `schema/blueprint.schema.json`、細かい上限は `src/shared/validate.ts`。見本は `blueprints/bedrock/sky-trap-tower.json`。

## 全体

```jsonc
{
  "schemaVersion": 1,
  "edition": "bedrock",            // "bedrock"（統合版）か "java"（Java版）。置くフォルダと同じにする
  "title": "天空トラップタワー",       // 80文字まで
  "summary": "1〜3文の説明",          // 一覧と詳細の最初に出る
  "author": "作った人",               // 任意
  "tags": ["トラップ", "経験値"],       // 任意。一覧で絞り込める（10個まで）
  "palette": { ... },               // ブロックの種類
  "ops": [ ... ],                   // ブロックの置き方
  "layerNames": { ... },            // 高さごとの名前（任意）
  "markers": [ ... ],               // プレイヤーが立つ場所（任意）
  "views": [ ... ],                 // 3D の視点（任意。なければ全体が収まる視点を自動で作る）
  "sideView": { ... },              // 横から見た図（任意。なければ出さない）
  "notes": { ... },                 // 各図の下の説明（任意）
  "materials": { ... },             // 素材表の補足（任意）
  "steps": "Markdown",              // 作る順番
  "usage": "Markdown"               // 使い方
}
```

## 座標

- x は東が +、z は南が +、y は上が +。配置図は上が北。
- 基準（0,0,0）は分かりやすい場所に置く（装置の中心の床など）。範囲は ±1024 まで、ブロックは合計30万個まで。

## palette

```jsonc
"palette": {
  "stone":  { "name": "建材ブロック（丸石など）", "color": "#8d949a", "item": "建材ブロック", "mc": "minecraft:cobblestone" },
  "slabB":  { "name": "ハーフ（下付き）", "color": "#b9bec2", "shape": "slabBottom", "label": "下", "item": "ハーフブロック" },
  "hopper": { "name": "ホッパー", "color": "#4a4e54" },
  "flow":   { "name": "流れる水（置かない）", "color": "#8fbcf2", "shape": "flowing", "count": false }
}
```

| 項目 | 意味 |
|---|---|
| キー | ops の `t` で使う名前。英数字と `_ : . -`、40文字まで |
| `name` | 凡例に出す名前（必須） |
| `color` | `#rrggbb`（必須）。種類ごとに見分けやすい色にする |
| `shape` | 表示の形。`box`（省略時）/ `slabBottom` / `slabTop` / `carpet` / `trapdoor`（`d` の側に立てた板）/ `torch` / `liquid`（水源など）/ `flowing`（流れる水。薄く表示） |
| `label` | 配置図のマスに出す1〜2文字（向き `d` があるブロックは矢印が優先） |
| `item` | 素材表でまとめる名前。同じ素材を役割で色分けしたいとき（湧き床と壁など）に使う |
| `count` | `false` なら素材表に数えない |
| `mc` | ゲーム内のブロックID（任意） |

## ops

上から順に適用し、後のものが上書きする。範囲は2つの角（両端を含む。順番は逆でもよい）。

| 書き方 | 意味 |
|---|---|
| `{ "fill": [[x1,y1,z1],[x2,y2,z2]], "t": "stone" }` | 箱の中を全部埋める |
| `{ "walls": [[x1,y1,z1],[x2,y2,z2]], "t": "stone" }` | 各高さで箱の外周だけを埋める（筒や部屋の壁。上下のふたは作らない） |
| `{ "set": [x,y,z], "t": "hopper", "d": "N" }` | 1つだけ置く |
| `{ "clear": [[x1,y1,z1],[x2,y2,z2]] }` | 消す（出入口の穴など） |

- `"d"`: 向き。`N`（北 -z）/ `S`（南 +z）/ `E`（東 +x）/ `W`（西 -x）/ `U`（上）/ `D`（下）。ホッパーの出口、トラップドアが付く側など。`fill`・`walls` にも付けられる。
- `"keep": true`: `fill`・`walls` で、すでに置いたブロックを上書きしない。
- 大量のブロックを1個ずつ置きたいとき（`.mcstructure` からの取り込みなど）は、`ops` の代わりに `"blocks": [[x,y,z,"種類"], [x,y,z,"種類","向き"], ...]` も使える。`blocks` が先に置かれ、そのあと `ops` が適用される。

## 表示用の情報

```jsonc
"layerNames": { "-1": "ホッパー・チェスト", "21": "水路の水" },

"markers": [
  { "pos": [0, -1.5, -7], "label": "待つ場所", "style": "solid" },          // 足もとの位置。小数も可（ハーフの上なら -1.5）
  { "pos": [0, -1.5, -2], "label": "倒すときに立つ場所", "style": "ghost" }   // ghost は薄い色・配置図では輪
],

"views": [
  { "id": "all", "label": "全体", "caption": "南西の上から", "camera": [-90,70,90], "target": [0,16,0], "size": 46 },
  { "id": "cut", "label": "断面", "caption": "東半分を外した断面", "clip": { "x": [null, 0] }, "camera": [120,20,40], "target": [0,16,0], "size": 46 },
  { "id": "room", "label": "待機部屋", "clip": { "y": [null, 3], "z": [-8, null] }, "exclude": ["slabT"], "camera": [40,32,-60], "target": [0,-0.5,-4], "size": 17 }
],
// clip: 表示する範囲（null は制限なし）。exclude: 隠す種類。size: 画面に収める幅（ブロック数）

"sideView": {
  "slice": "x", "at": 0,                        // x=0 の断面を横（南北）に並べる。"z" なら z=at の断面を東西に並べる
  "alsoShow": [{ "t": "trapdoor", "at": 2 }],   // 別の断面から重ねて見せたい種類
  "labels": [[0, "0 着地"], [21, "21 水路"]]     // 横線と見出し
},

"notes": { "viewer": "3D の下の説明", "side": "横から見た図の説明", "plan": "配置図の説明" },

"materials": {
  "notes": { "ホッパー": "鉄インゴット{n*5}個", "ハーフブロック": "下付き{slabB}・上付き{slabT}" },
  // item 名 → 補足。{n} は合計、{n*5} は掛け算、{パレットのキー} はその種類の数
  "extra": [{ "name": "はしご", "count": "約45個〜", "note": "地面から待機部屋までの高さ分" }]
}
```

## 元の HTML から移すときの対応

| 元の HTML | JSON |
|---|---|
| `build()` の `set(x,y,z,'t',d)` とループ | `ops`（`fill` / `walls` / `set`） |
| `if(!has(x,y,z)) set(...)` | `"keep": true` |
| `B.delete(k(...))` | `clear` |
| 種類の表（`T={stone:{n:"…",c:"#…"}}` など） | `palette` の `name` / `color` |
| 素材表の行と補足 | `item`・`materials.notes`・`materials.extra` |
| 高さの名前を返す関数（`lname` など） | `layerNames`（高さごとに書き出す） |
| 3D の視点ボタン（`view("all")` など） | `views` |
| 横から見た図（SVG） | `sideView` |
| プレイヤーの柱や赤い点 | `markers` |
| 「作る順番」「使い方」の文章 | `steps`・`usage`（Markdown。太字は `**…**`、注意書きは太字にする） |
