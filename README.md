# Minecraft_Blueprints

マイクラの設計図置き場です。設計図を保存して、知り合いに URL で見せるためのサイトです。

**サイト**: https://an-dot-su4.github.io/Minecraft_Blueprints/

- 設計図1件ごとに、素材表・3D表示・横から見た高さ・段ごとの配置図・作る順番を表示します
- 統合版と Java 版を分けて管理します（URL は `be/<名前>/` と `je/<名前>/`）
- 検索エンジンには出ないようにしています（ただしリポジトリは公開なので、中身は GitHub からも読めます）

## 設計図の追加のしかた

Claude（Claude Code）に頼みます。このリポジトリには、設計図を追加するための Skill（[`.claude/skills/add-blueprint`](.claude/skills/add-blueprint/SKILL.md)）が入っています。

> この設計図をサイトに追加して https://claude.ai/artifact/xxxx

> 統合版のアイアンゴーレムトラップの設計図を作って、サイトに載せて

Claude が次の流れで進めます。

1. 渡された設計図（アーティファクトの URL・HTML・JSON・言葉での説明）を読む
2. `blueprints/bedrock/` か `blueprints/java/` に JSON として書く
3. チェック（と、元の設計図とブロックが同じかの比較）をする
4. main に push する

push すると、数分でサイトに反映されます。

Claude Code 以外（claude.ai のチャットなど）で JSON だけ作ってもらう場合は、[形式の説明](.claude/skills/add-blueprint/reference.md)を渡してください。

## 最初の1回だけの設定

1. リポジトリを **Public** にする（Settings → General → Danger Zone → Change visibility）
2. **Settings → Pages → Build and deployment → Source** を「**GitHub Actions**」にする
3. main に push すると（または Actions の「公開」を手動で実行すると）公開されます

## 構成

| 場所 | 中身 |
|---|---|
| `blueprints/<bedrock\|java>/*.json` | 設計図（[形式](schema/blueprint.schema.json)） |
| `src/` | サイトの画面（Vite + TypeScript + three.js） |
| `scripts/` | ビルド用のデータ書き出し、`check`（チェックと要約）、`compare`（元の設計図との比較） |
| `.claude/skills/add-blueprint/` | 設計図を追加するための Skill と形式の説明 |
| `.github/workflows/deploy.yml` | main への push で GitHub Pages に公開 |

## 手元で動かす

```sh
npm install
npm run dev        # http://localhost:5173
npm run check      # 設計図のチェックと要約
npm test
```
