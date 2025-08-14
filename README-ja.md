# Gemini CLI on VSCode

**🇯🇵 日本語版** | [🇺🇸 English](README.md)

## 🔮 MAGUS Council - 3つのAI CLIを統一管理

![Extension Features](images/Broadcast_your_pain_to_all_AI_CLIs_with_one_click.png)

## 💡 なぜこの拡張が革新的なのか？

- ❌ 従来：ターミナルでのみ動作するGemini CLIやCodex CLI
- ✅ 革新：エディタ統合による統一AI管理システム

### 🔄 従来の制約

- **Gemini CLI / Codex CLI**: 強力だが**ターミナルパネルでしか動作しない**
- **Gemini Code Assist**: エディタ統合されているが**まったく別のツール**
- **Claude Code**: 完璧なエディタ統合だが**GeminiもGPT-5も使えない**

### ✨ この拡張の革新

#### Claude Codeのエディタ統合体験を3つのAI CLIで実現

- Gemini CLI & Codex CLI がエディタウィンドウで直接動作
- **MAGUS Council**で一つのプロンプトを複数のAI CLIへ一括送信

## ⚡ 主要機能

### 🖱️ ワンクリック起動

- **3種のAIを一括起動**と個別起動
- **エディタタイトルバーのアイコン**で即座にアクセス

### 🔧 真のエディタ統合

- ターミナルパネルではなくエディタタブとして開く
- コードファイルと並べて表示
- エディタレイアウトを維持

### 💻 シームレスなワークフロー

- AI支援を使用中もコードを表示し続ける
- ターミナルとエディタ間のコンテキストスイッチが不要
- 開発フローと自然に統合

### 🔮 v0.1.0 メジャーアップデート - MAGUS Council

- **MAGUS Council** - Multiple Agent Guidance & Intelligence System 🔮
  - **プロンプトの一斉配信機能**: Gemini、Claude、Codexをシンクロ操作
  - **全てはシナリオ通りに**: 各AI特化の実行タイミングを最適化

### 🎨 その他の主要機能

- **Claude Code 統合**: 3つのAI CLIを完全統合
- **一括起動機能**: 「Launch All CLIs」ボタンで3つのCLIを同時起動
- **ユニバーサル履歴保存**: 統一履歴フォルダ `.history-memo/` で作業記録を管理
- **個別CLIコマンド**: 各CLIに専用の送信コマンド
- **詳細な設定オプション**: 各CLIの有効/無効、メニュー表示制御など

## 🚀 クイックスタート

### 前提条件

```bash
# Gemini CLIのインストール （Gemini使用時）
npm install -g @google/gemini-cli
gemini  # Googleアカウント認証

# Codex CLIのインストール（GPT-5使用時）
npm install -g codex
codex   # OpenAIアカウント認証

# Claude CLIのインストール（Claude使用時）
npm install -g @anthropic-ai/claude-cli
claude  # Anthropicアカウント認証
```

### 使用方法

1. **VS Codeで任意のプロジェクトを開く**
2. **エディタタイトルバーのアイコンをクリック**
   - 🚀 **Launch All CLIs** - 3つのCLIを一括起動
   - ✨ Gemini CLI起動
   - ❄️ Codex CLI起動
   - ✴️ Claude Code起動
3. **MAGUS Councilを起動**
   - サイドバーにMAGUS Councilパネルが表示
   - コマンドパレット: "MAGUS Council: Open"
4. **使用したいAIを選択してプロンプト送信**
   - 複数AI選択で同時実行可能

### 🎨 エディタタイトルバーのボタンカスタマイズ

**ボタンを非表示にする：**
- エディタタイトルバーのボタンを**右クリック**
- メニューから該当コマンドの**チェックを外す**

**ボタンを再表示する：**
- エディタタイトルバーの**空いている場所を右クリック**
- メニューから非表示にしたコマンドに**チェックを入れる**

💡 **ヒント**: ボタンを非表示にしても、コマンドパレット（`Cmd/Ctrl+Shift+P`）からすべての機能にアクセス可能です。

### 📁 ファイル/フォルダをAI CLIに送信

**エクスプローラーから送信**

- ファイルまたはフォルダを右クリック
- "Gemini CLI: Send File Path"、"Codex CLI: Send File Path"、または "Claude Code: Send File Path" を選択
- 複数選択対応（Ctrl/Cmd+クリック）

**エディタタブから送信**

- エディタタブで右クリック
- 使用したいCLIのコマンドを選択

**開いているファイルをすべて送信**

- エディタ内で右クリック
- 使用したいCLI用の "Send Open File Path" を選択

すべてのパスが`@`付きで選択したCLIに送信されます。

### 💾 ユニバーサル履歴保存

すべてのターミナル出力を `.history-memo/YYYY-MM-DD.md` に保存：

**任意のターミナルから:**

- テキストを選択 → ステータスバーの「Save to History」ボタンをクリック
- Gemini CLI、Codex CLI、bash、zsh、Claude Code等すべてで動作

**カスタムキーボードショートカット:**

- VSCodeキーボードショートカット設定で独自に設定

### 📤 AI CLIへ送信

**選択テキストの送信:**

- エディタでテキストを選択 → 右クリック
- "Gemini CLI: Send Selected Text"、"Codex CLI: Send Selected Text"、または "Claude Code: Send Selected Text"

**ファイル/フォルダパスの送信:**

- エクスプローラーで右クリック
- 使用したいCLI用のコマンドを選択
- 複数選択可能、フォルダも送信可能

**開いているすべてのファイルを送信:**

- エディタで右クリック
- 使用したいCLI用の "Send Open File Path" を選択

### 🔮 MAGUS Council の使い方

**統一制御パネルから:**

1. サイドバーのMAGUS Councilパネルを開く
2. 使用したいAI（Gemini/Claude/Codex）をチェック
3. プロンプトを入力
4. 「🔮 Ask n AIs」ボタンで一斉送信

**個別制御も可能:**

- 各AIタブで直接操作
- 従来通りのファイル送信機能
- コンテキストメニューからの操作

### ⌨️ コマンドパレット

**MAGUS Council コマンド:**

- **"MAGUS Council: Open"** - 統一制御パネルを開く
- **"Multi-AI: Ask All"** - 選択したAIに一斉送信

**既存のコマンド:**

- **"Launch All CLIs"** - 3つのCLIを一括起動（同じグループにタブとして配置）

**Gemini CLI コマンド:**

- "Gemini CLI: Start in New Pane" - 新しいペインで起動
- "Gemini CLI: Start in Active Pane" - アクティブペインで起動
- "Gemini CLI: Send File Path" - ファイル/フォルダパスを送信
- "Gemini CLI: Send Open File Path" - 開いているファイルをすべて送信
- "Gemini CLI: Send Selected Text" - 選択テキストを送信

**Codex CLI コマンド:**

- "Codex CLI: Start in New Pane" - 新しいペインで起動
- "Codex CLI: Start in Active Pane" - アクティブペインで起動
- "Codex CLI: Send File Path" - ファイル/フォルダパスを送信
- "Codex CLI: Send Open File Path" - 開いているファイルをすべて送信
- "Codex CLI: Send Selected Text" - 選択テキストを送信

**Claude Code コマンド:**

- "Claude Code: Start in New Pane" - 新しいペインで起動
- "Claude Code: Start in Active Pane" - アクティブペインで起動
- "Claude Code: Send File Path" - ファイル/フォルダパスを送信
- "Claude Code: Send Open File Path" - 開いているファイルをすべて送信
- "Claude Code: Send Selected Text" - 選択テキストを送信

**共通コマンド:**

- "Save to History" - 履歴を保存（すべてのターミナルで動作）

### ⌨️ カスタムキーボードショートカット

独自のキーバインディングを設定可能：

1. キーボードショートカットを開く: `Cmd+K Cmd+S`（Mac）または `Ctrl+K Ctrl+S`（Windows/Linux）
2. "CLI" で検索
3. 鉛筆アイコンをクリックしてお好みのキーを割り当て

## 🆚 他の選択肢との比較

### 🎯 最適なユースケース

- **Claude CodeのUXが好きだがGeminiやGPT-5を使いたい**開発者
- ターミナルとエディタの切り替えに**うんざりしている**人

### 📊 比較表

| 機能 | この拡張 | Gemini Code Assist | Gemini CLI | Codex CLI | Claude Code |
|------|----------|--------------------------|-------------------|-------------------|----------------|
| **統一AI管理** | ✅ MAGUS Council | ❌ | ❌ | ❌ | ❌ |
| **同時プロンプト送信** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **コード生成** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **エディタペインで動作** | ✅ | ❌（サイドバー） | ❌（ターミナル） | ❌（ターミナル） | ✅ |
| **Geminiモデル対応** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **OpenAIモデル対応** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Claudeモデル対応** | ✅ | ❌ | ❌ | ❌ | ✅ |

## ⚙️ 設定オプション

### MAGUS Council 設定

```json
{
  // AI機能の有効/無効
  "gemini-cli-vscode.gemini.enabled": true,
  "gemini-cli-vscode.codex.enabled": true,
  "gemini-cli-vscode.claude.enabled": true,
  
  // MAGUS Council実行タイミング
  "gemini-cli-vscode.multiAI.composer.delays.initial": 100,
  "gemini-cli-vscode.multiAI.composer.delays.claude.enter": 150,
  "gemini-cli-vscode.multiAI.composer.delays.gemini.enter": 600,
  
  // 一括起動設定
  "gemini-cli-vscode.multiAI.launch.clis": ["claude", "gemini", "codex"]
}
```

設定の説明:

- `enabled`: 各CLIの機能とエディタタイトルバーアイコンの表示を制御
- `showInContextMenu`: 右クリックメニューでのコマンド表示を制御
- `multiCLI.enabled`: マルチCLI機能（一括起動）の有効/無効
- `multiCLI.launch.clis`: 一括起動するCLIと起動順序（配列の順番で起動）
- `saveToHistory.showStatusBar`: ステータスバーの「Save to History」ボタン表示
- `saveToHistory.includeTerminalName`: 履歴エントリにターミナル名を含める
- `terminal.disableFlowControl`: XON/XOFFフロー制御を無効化（Ctrl+Sフリーズ防止）

## 🛠️ 開発

### ローカル開発

```bash
git clone https://github.com/d3j/gemini-cli-on-vscode.git
cd gemini-cli-on-vscode
npm install
npm run compile
```

### デバッグ

1. VS Codeでプロジェクトを開く
2. `F5` を押してExtension Development Hostを起動
3. 新しいVS Codeウィンドウで拡張機能をテスト

## 🐛 トラブルシューティング

### よくある問題

#### Q: "gemini: command not found" エラー

```bash
# 解決策：Gemini CLIをインストール
npm install -g @google/gemini-cli
```

#### Q: 認証エラー

```bash
# 解決策：最初にターミナルで直接認証
gemini
# ブラウザ認証を完了してから、拡張機能を再試行
```

#### Q: エディタタイトルバーに拡張機能が表示されない

- アクティブなエディタが開いていることを確認
- VS Codeウィンドウをリロード（`Cmd+R` / `Ctrl+R`）してみる

### 🔧 出力フリーズ防止

この拡張機能によって起動した Gemini または Codex CLI のフロー制御の問題を `stty -ixon` を自動的に適用して防止します。

**注意:** これは長く高速な出力に伴うVS Code統合ターミナルの既知の問題への対処です。

## 🤝 コントリビューション

バグ報告、機能リクエスト、プルリクエストを歓迎します！

- **バグ報告**: [Issues](https://github.com/d3j/gemini-cli-on-vscode/issues)
- **機能リクエスト**: [Issues](https://github.com/d3j/gemini-cli-on-vscode/issues)
- **プルリクエスト**: [Pull Requests](https://github.com/d3j/gemini-cli-on-vscode/pulls)

## 🙏 謝辞

- [Gemini CLI](https://github.com/google-gemini/gemini-cli) by Google
- [Claude Code](https://claude.ai/claude-code) by Anthropic
- VS Code Extension開発者コミュニティ

### 🎨 アイコン素材

この拡張機能で使用しているアイコンの著作権は各権利者に帰属します：

- **AllCLIs-icon.png** - [いらすとや](https://www.irasutoya.com/)
- **claude-logo.png** - Anthropic
- **codex-icon.png** - OpenAI
- **icon.png** (Gemini) - Google

※ 各企業のロゴは識別目的でのみ使用しており、この拡張機能は各社と公式な提携関係にはありません。

---

## 📈 この拡張を気に入ったら

⭐ **GitHubでスターをお願いします！**
🐛 **バグを見つけたら報告してください**
💡 **機能アイデアを共有してください**
📢 **チームで共有してください**

[⭐ GitHubでスター](https://github.com/d3j/gemini-cli-on-vscode) | [🐛 バグ報告](https://github.com/d3j/gemini-cli-on-vscode/issues) | [💡 機能リクエスト](https://github.com/d3j/gemini-cli-on-vscode/issues)

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 👤 作者

**Joji Jorge Senda** ([@d3j](https://github.com/d3j))

---

AIコーディングアシスタントを使用中にターミナルとエディタを切り替える日々のフラストレーションから生まれました。この拡張は両方の世界のベストを提供します - Claude Codeのエレガントなエディタ統合とGemini CLIの強力な機能を。このドキュメントは陳腐な機能拡張を世界を変えるほど壮大な機能の様に思わせる機能を期待しています。でも、それでいいのかもしれません。小さなツールでも、誰かの小さな問題を解決できれば世界は少し良くなる。
