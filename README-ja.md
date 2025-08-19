# Gemini CLI on VSCode ?

**🇯🇵 日本語版** | [🇺🇸 English](README.md)

## 🔮 MAGUS Council - 統一AI CLI管理システム

![Extension Features](images/Broadcast_your_pain_to_all_AI_CLIs_with_one_click.png)

### ついに：Claude Codeと同じ体験をGemini CLI & Codex CLI (GPT-5)でも

## 💡 なぜこの拡張が革新的なのか？

- ❌ 従来：ターミナルでのみ動作するGemini CLIやCodex CLI
- ✅ 革新：エディタ統合による統一AI管理システム

### 🔄 従来の制約

- **Gemini CLI / Codex CLI**: 強力だが**ターミナルパネルでしか動作しない**
- **Gemini Code Assist**: エディタ統合されているが**まったく別のツール**
- **Claude Code**: 完璧なエディタ統合だが**GeminiもGPT-5も使えない**

### ✨ この拡張の革新

#### Claude Codeのエディタ統合体験を複数のAI CLIで実現

- Gemini, Codex, Qwen がエディタウィンドウへ直接起動
- **MAGUS Council**で一つのプロンプトを複数のAI CLIへ一括送信

## ⚡ 主要機能

### 🖱️ ワンクリック起動

- **4種のAIを一括起動**と個別起動
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
  - **統一プロンプト配信**: Gemini、Claude、Codex、Qwen を完璧にシンクロ操作
  - **全てはシナリオ通りに**: 各AIタイプに最適化された実行タイミング

### 🎨 その他の主要機能

- **Claude Code 統合**: 複数のAI CLIを完全統合
- **一括起動機能**: 「Launch All CLIs」ボタンで複数のCLIを同時起動
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

# Qwen CLIのインストール（Qwen使用時）
npm install -g @qwen-code/qwen-code@latest
qwen    # Qwenアカウント認証
```

### 使用方法

1. **VS Codeで任意のプロジェクトを開く**
2. **エディタタイトルバーのアイコンをクリック**
   - 🚀 **Launch All CLIs** - 設定済みのすべてのCLIを一括起動
   - ✨ Gemini CLI起動
   - ❄️ Codex CLI起動
   - ✴️ Claude Code起動
   - 🐉 Qwen Code起動
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

- **"Launch All CLIs"** - 複数のCLIを一括起動（同じグループにタブとして配置）

**CLIコマンド（v0.2.1+ 階層構造）:**

すべてのコマンドは一貫したパターンに従います: `{拡張機能}.{CLI}.{アクション}.{対象}`

**Gemini CLI:**
- `gemini.start.newPane` - 新しいペインでGeminiを起動
- `gemini.start.activePane` - アクティブペインでGeminiを起動
- `gemini.send.selectedText` - 選択テキストをGeminiに送信
- `gemini.send.filePath` - ファイル/フォルダをGeminiに送信
- `gemini.send.openFiles` - 開いているすべてのファイルをGeminiに送信

**Codex CLI:**
- `codex.start.newPane` - 新しいペインでCodexを起動
- `codex.start.activePane` - アクティブペインでCodexを起動
- `codex.send.selectedText` - 選択テキストをCodexに送信
- `codex.send.filePath` - ファイル/フォルダをCodexに送信
- `codex.send.openFiles` - 開いているすべてのファイルをCodexに送信

**Claude CLI:**
- `claude.start.newPane` - 新しいペインでClaudeを起動
- `claude.start.activePane` - アクティブペインでClaudeを起動
- `claude.send.selectedText` - 選択テキストをClaudeに送信
- `claude.send.filePath` - ファイル/フォルダをClaudeに送信
- `claude.send.openFiles` - 開いているすべてのファイルをClaudeに送信

**Qwen CLI:**
- `qwen.start.newPane` - 新しいペインでQwenを起動
- `qwen.start.activePane` - アクティブペインでQwenを起動
- `qwen.send.selectedText` - 選択テキストをQwenに送信
- `qwen.send.filePath` - ファイル/フォルダをQwenに送信
- `qwen.send.openFiles` - 開いているすべてのファイルをQwenに送信

**共通コマンド:**
- `saveClipboardToHistory` - 会話を保存（すべてのターミナルで動作）
- `launchAllCLIs` - 有効化されているすべてのCLIを同時起動
- `multiAI.openComposer` - MAGUS Councilコンポーザーを開く
- `multiAI.askAll` - すべてのアクティブなCLIに送信

### ⌨️ カスタムキーボードショートカット

独自のキーバインディングを設定できます：

1. キーボードショートカットを開く: `Cmd+K Cmd+S`（Mac）または `Ctrl+K Ctrl+S`（Windows/Linux）
2. コマンドを検索（例: "gemini.start" または "claude.send"）
3. 鉛筆アイコンをクリックしてお好みのキーを割り当て

**注意:** v0.2.0以前のバージョンからカスタムキーバインディングを使用している場合は、[MIGRATION.md](./MIGRATION.md)を参照して更新手順をご確認ください。

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
| **Qwenモデル対応** | ✅ | ❌ | ❌ | ❌ | ❌ |

## ⚙️ 設定オプション

設定は使いやすさのために2階層に整理されています：

### 標準設定（メイン設定）

ほとんどのユーザーが必要とする必須設定：

```json
{
  // AI機能の有効/無効
  "gemini-cli-vscode.gemini.enabled": true,
  "gemini-cli-vscode.codex.enabled": true,
  "gemini-cli-vscode.claude.enabled": true,
  "gemini-cli-vscode.qwen.enabled": false,  // ベータ機能
  
  // コア機能
  "gemini-cli-vscode.magusCouncil.enabled": true,
  "gemini-cli-vscode.contextMenu.enabled": true,
  "gemini-cli-vscode.saveToHistory.enabled": true
}
```

### 高度な設定（詳細調整）

詳細なコントロールを求めるパワーユーザー向け：

```json
{
  // MAGUS Council設定
  "gemini-cli-vscode.magusCouncil.defaultAgents": ["gemini", "codex", "claude"],
  "gemini-cli-vscode.magusCouncil.launch.clis": ["claude", "gemini", "codex"],
  "gemini-cli-vscode.magusCouncil.composer.delays.initial": 100,
  
  // コンテキストメニュー詳細調整
  "gemini-cli-vscode.contextMenu.showSendText": true,
  "gemini-cli-vscode.contextMenu.showSendFilePath": true,
  "gemini-cli-vscode.gemini.showInContextMenu": true,
  
  // カスタムCLIコマンド（例）
  "gemini-cli-vscode.gemini.command": "gemini",
  "gemini-cli-vscode.gemini.args": ["--model", "gemini-pro"],
  "gemini-cli-vscode.claude.command": "claude",
  "gemini-cli-vscode.claude.args": [],
  
  // ターミナル動作
  "gemini-cli-vscode.terminal.groupingBehavior": "same",
  "gemini-cli-vscode.terminal.disableFlowControl": true
}
```

### 設定の説明

**標準設定：**
- `*.enabled`: 各AI CLI統合の有効/無効
- `magusCouncil.enabled`: 統一AI管理インターフェースの有効化
- `contextMenu.enabled`: 右クリックメニューにAIコマンドを表示
- `saveToHistory.enabled`: `.history-memo`への会話保存を有効化

**高度な設定：**
- `magusCouncil.defaultAgents`: MAGUS Council起動時に事前選択されるAI
- `magusCouncil.launch.clis`: 「Launch All CLIs」の順序と選択
- `contextMenu.show*`: メニュー項目の詳細制御
- `*.command` / `*.args`: CLI起動コマンドのカスタマイズ
- `terminal.groupingBehavior`: ターミナルのグループ化方法（"same"または"new"）

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
