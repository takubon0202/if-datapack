# Codex CLI連携スキル

OpenAI Codex CLIを使用してコード生成・エラー解決・Webリサーチを行います。
**ChatGPT Plusサブスクリプション**に含まれており、追加費用なしで利用できます。

## 使用方法

```
/codex タスク内容
```

## 実行されるコマンド（重要）

$ARGUMENTS を受け取り、Codex CLIを**非対話モード**で実行します。

**必ずstdin経由でプロンプトを渡してください:**

```bash
echo "今日は[今日の日付]です。$ARGUMENTS" | codex exec - --sandbox read-only
```

> **重要: `codex exec -` の形式を使用**
> - `-` はstdinからプロンプトを読み込む指定
> - 引数で直接渡すと特殊文字でエラーになる場合がある
> - `--sandbox read-only` で読み取り専用モード（安全）

## 正しいコマンド例

```bash
# 読み取り専用（リサーチ用 - 推奨）
echo "質問内容" | codex exec - --sandbox read-only

# ワークスペース書き込み可能（コード生成用）
echo "コード生成タスク" | codex exec - --sandbox workspace-write

# 日付を含めたリサーチ
echo "今日は[今日の日付]です。調査内容" | codex exec - --sandbox read-only
```

## 間違ったコマンド例（これらは使わない）

```bash
# NG: 対話モードになりハングする
codex "質問"

# NG: stdin指定なしだと入力待ちになることがある
codex exec "質問"
```

## サンドボックスモード

| モード | 説明 | 用途 |
|--------|------|------|
| `read-only` | ファイル読み取りのみ | リサーチ、調査 |
| `workspace-write` | ワークスペース書き込み可 | コード生成、修正 |
| `danger-full-access` | 全アクセス（危険） | 使用しない |

## 自動発動条件

- 同じエラーが3回以上発生
- 「Codexで」「GPTで」と明示的に依頼
- Claude単体では解決困難なタスク

## 使用モデル

- **gpt-5.3-codex** - 高性能推論モード（自動選択）

## 必要なもの

- **ChatGPT Plus** ($20/月)
- Node.js
- Codex CLI v0.92.0以上

## セットアップ

```bash
npm install -g @openai/codex
codex  # 初回起動時にOpenAIログイン
```

## 使用量上限について

使用量上限に達した場合、即座に報告し使用を停止します。
追加課金を防ぐため、制限が回復するまで該当CLIは使用しません。
