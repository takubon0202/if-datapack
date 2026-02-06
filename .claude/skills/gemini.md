# Gemini CLI 連携スキル

Google Gemini CLI を使用してリサーチ・コード生成・エージェント機能を活用します。

## 重要: Gemini 3系のみ使用

**使用可能なモデル**:
- `gemini-3-pro-preview` - 詳細な調査、複雑なタスク
- `gemini-3-flash-preview` - 高速処理、簡易タスク

**使用禁止**:
- Gemini 2.5系（gemini-2.5-pro, gemini-2.5-flash等）は絶対に使用しない

## 今日の日付

2026-02-06

すべての調査・リサーチには必ずこの日付を含めてください。

## 正しいコマンド形式

```bash
# 推奨: Gemini 3 Pro（非対話モード）
gemini -m gemini-3-pro-preview "今日は2026-02-06です。[質問]"

# 高速: Gemini 3 Flash
gemini -m gemini-3-flash-preview "今日は2026-02-06です。[質問]"
```

---

## インストール済み拡張機能一覧

| 拡張機能 | バージョン | 主な機能 |
|----------|------------|----------|
| **code-review** | 0.1.0 | コードレビュー自動化 |
| **conductor** | 0.2.0 | 機能計画策定・実装管理 |
| **gemini-cli-jules** | 0.1.0 | 非同期コーディングエージェント |
| **gemini-cli-security** | 0.4.0 | セキュリティ脆弱性分析 |
| **nanobanana** | 1.0.10 | 画像生成・編集・復元 |

---

## 1. Code Review 拡張機能

コード変更のレビューを自動化します。

### コマンド

```bash
# Gemini CLI対話モードで
/code-review
```

### 機能
- コード変更の品質レビュー
- ベストプラクティスの提案
- 潜在的な問題の検出

---

## 2. Conductor 拡張機能

ソフトウェア機能の仕様策定、計画、実装を支援します。

### ファイル構造

```
conductor/
├── index.md           # インデックス
├── product.md         # 製品定義
├── tech-stack.md      # 技術スタック
├── workflow.md        # ワークフロー
├── product-guidelines.md  # ガイドライン
├── tracks.md          # トラックレジストリ
└── tracks/            # 各トラック（機能）
    └── <track_id>/
        ├── index.md
        ├── spec.md    # 仕様書
        ├── plan.md    # 実装計画
        └── metadata.json
```

### 使い方

```bash
# Gemini CLI対話モードで
gemini

# 計画について質問
「プランを見せて」
「この機能の仕様を確認したい」
```

---

## 3. Jules 拡張機能（コーディングエージェント）

バックグラウンドでコーディングタスクを実行する非同期エージェント。

### 重要: Git操作の禁止

**JulesはGit操作（PR作成、コミット、プッシュ）を行わない。**
Git操作は全てClaudeが担当する。

### コマンド

```bash
# Gemini CLI対話モードで
/jules <タスク内容>
/jules status          # 進捗確認
```

### 使用可能なタスク

| タスク | コマンド例 |
|--------|-----------|
| **新機能追加** | `/jules 新機能を追加して` |
| **バグ修正** | `/jules このバグを修正して` |
| **リファクタリング** | `/jules この関数を小さな関数に分割して` |
| **コードスタイル統一** | `/jules ESLint警告を全て修正して` |
| **テスト追加** | `/jules このファイルにユニットテストを追加して` |

### 作業フロー

```
1. /jules [タスク] を実行
     ↓
2. Julesがコードを分析・修正
     ↓
3. 修正内容を確認
     ↓
4. Claudeがgit add/commit/pushを実行 ← ここはClaude担当
```

### 前提条件
- Julesアカウント作成（https://jules.google.com）
- `npm install -g @google/jules`（未インストールの場合）

### 禁止事項
- **Git操作禁止**: PR作成、コミット、プッシュは全てClaude担当
- **GitHub連携不要**: JulesにGitHub権限を与えない

---

## 4. Security 拡張機能（脆弱性分析）

コードのセキュリティ脆弱性を検出・分析します。

### コマンド

```bash
# Gemini CLI対話モードで

# 包括的スキャン（推奨）
/security:analyze

# 手動レビュー
「このコードのセキュリティを確認して」
```

### 検出可能な脆弱性カテゴリ

| カテゴリ | 検出内容 |
|----------|----------|
| **ハードコードされた秘密** | APIキー、パスワード、秘密鍵、DB接続文字列 |
| **アクセス制御の欠陥** | IDOR、権限昇格、パストラバーサル |
| **データ処理の弱点** | 弱い暗号化、ログへの機密情報出力、PII漏洩 |
| **インジェクション** | SQLi、XSS、コマンドインジェクション、SSRF、SSTI |
| **認証の問題** | 認証バイパス、弱いセッショントークン、パスワードリセットの欠陥 |
| **LLM安全性** | プロンプトインジェクション、不適切な出力処理 |
| **プライバシー違反** | PII/SPIの露出、サードパーティへの送信 |

### 重大度レベル

| レベル | 説明 |
|--------|------|
| **Critical** | RCE、全システム侵害、全データアクセス可能 |
| **High** | 任意ユーザーのデータ読み書き、重大なDoS |
| **Medium** | 限定的なデータアクセス、ユーザー操作が必要 |
| **Low** | 影響が最小限、悪用が非常に困難 |

### 出力先
分析結果は `.gemini_security/` ディレクトリに保存されます。

---

## 5. Nano Banana 拡張機能（画像生成）

Gemini 2.5 Flash Imageモデルを使用した画像生成・編集・復元。

### コマンド一覧

| コマンド | 用途 | 例 |
|----------|------|-----|
| `/icon` | アイコン生成 | `/icon アプリアイコン 32x32` |
| `/pattern` | パターン生成 | `/pattern テクスチャ --seamless` |
| `/diagram` | ダイアグラム作成 | `/diagram システム構成図` |
| `/edit` | 画像編集 | `/edit 背景を削除` |
| `/restore` | 画像復元 | `/restore 傷を修復` |
| `/story` | ストーリー画像連続生成 | `/story 4コマ漫画` |

### オプション

```bash
# 枚数指定（必ず指定数を生成）
--count=3

# スタイル指定
--styles=watercolor,sketch,photorealistic

# バリエーション指定
--variations=lighting,angle,color-palette,composition,mood,season,time-of-day
```

### 例

```bash
# Gemini CLI対話モードで
gemini

# アイコン生成
/icon アプリアイコン 64x64 --count=3 --styles=pixel-art

# シームレスパターン
/pattern テクスチャ --seamless --density=medium

# ダイアグラム
/diagram フロー図 --labels
```

### 品質基準
- テキストの正確性（スペルチェック、文法）
- ストーリーコマンドでの視覚的一貫性
- 指定パラメータの厳守

---

## 高度な検索機能

Gemini CLIはGoogle Searchグラウンディングを内蔵しており、最新のWeb情報にアクセスできます。

### 検索コマンド例

```bash
# 最新情報検索
gemini -m gemini-3-pro-preview "今日は2026-02-06です。[検索クエリ]"

# URL解析
gemini -m gemini-3-pro-preview "https://example.com の内容を要約して"

# 複合リサーチ
gemini -m gemini-3-pro-preview "今日は2026-02-06です。[調査クエリ]"
```

---

## 拡張機能管理コマンド

```bash
# 一覧表示
gemini extensions list

# インストール
gemini extensions install <GitHub URL> --auto-update

# アンインストール
gemini extensions uninstall <extension-name>

# 有効化/無効化
gemini extensions enable <extension-name>
gemini extensions disable <extension-name>
```

---

## 使用量上限について

使用量上限に達した場合、即座に報告し使用を停止します。
追加課金を防ぐため、制限が回復するまで該当CLIは使用しません。
