# Gemini CLI on VSCode

**🇯🇵 日本語版** | [🇺🇸 English](README.md)

## 🎨 エディタウィンドウで動くGemini & Codex CLI

### ついに実現：Claude Codeと同じ体験をGemini CLI & Codex CLI (GPT-5) で

![Extension Features](images/ExtensionFeatures.png)

## 💡 なぜこの拡張が革新的なのか？

- ❌ 従来：ターミナルでのみ動作するGemini CLI
- ✅ 革新：エディタ統合によるClaude Code風体験

### 🔄 従来の制約

- **Gemini CLI / Codex CLI**: 強力だが**ターミナルパネルでしか動作しない**
- **Gemini Code Assist**: エディタ統合されているが**まったく別のツール**
- **Claude Code**: 完璧なエディタ統合だが**GeminiもGPT-5も使えない**

### ✨ この拡張の革新

#### Claude Codeのエディタ統合体験をGemini CLI & Codex CLIで実現

- Gemini CLI & Codex CLI (GPT-5) がエディタウィンドウで直接動作
- ターミナルとエディタの切り替えが不要に
- Claude Codeユーザーが愛するワークフローをGeminiとGPT-5で
- **業界初**: 複数のAI CLIを同時にエディタペインで管理

## ⚡ 主要機能

### 🖱️ ワンクリック起動

- **エディタタイトルバーのアイコン**で即座にアクセス
- **コマンドパレット**統合

### 🔧 真のエディタ統合

- ターミナルパネルではなくエディタタブとして開く
- コードファイルと並べて表示
- エディタレイアウトを維持

### 💻 シームレスなワークフロー

- AI支援を使用中もコードを表示し続ける
- ターミナルとエディタ間のコンテキストスイッチが不要
- 開発フローと自然に統合

### 🆕 スマート機能

#### v0.0.6 🚀 NEW - GPT-5リリース記念！

- **Codex CLI サポート**: OpenAIのCodex CLI (GPT-5対応) をエディタペインで実行
- **ユニバーサル履歴保存**: 複数のAI CLI（Gemini CLI、Codex CLI、Claude Code）で動作
  - 統一履歴フォルダ `.history-memo/` で日々の作業記録を管理
- **個別CLIコマンド**: Gemini/Codex それぞれに専用コマンド
  - Gemini CLI: Send Selected Text / File Path / Open File Path
  - Codex CLI: Send Selected Text / File Path / Open File Path
- **詳細な設定オプション**:
  - `gemini.enabled` / `codex.enabled` - 各CLIの有効/無効
  - `gemini.showInContextMenu` / `codex.showInContextMenu` - コンテキストメニュー表示
  - `saveToHistory.showStatusBar` - ステータスバー表示制御
  - `saveToHistory.includeTerminalName` - 履歴にターミナル名を含める

## 🚀 クイックスタート

### 前提条件

```bash
# Gemini CLIのインストール （Gemini使用時）
npm install -g @google/gemini-cli
gemini  # Googleアカウント認証

# Codex CLIのインストール（GPT-5使用時）
npm install -g codex
codex   # OpenAIアカウント認証
```

### 使用方法

1. **VS Codeで任意のプロジェクトを開く**
2. **エディタタイトルバーのアイコンをクリック**
   - ✨ Gemini CLI起動
   - ❄️ Codex CLI起動
3. **AI CLIが新しいエディタペインで起動！**

### 📁 ファイル/フォルダをAI CLIに送信

**エクスプローラーから送信**

- ファイルまたはフォルダを右クリック
- "Gemini CLI: Send File Path" または "Codex CLI: Send File Path" を選択
- 複数選択対応（Ctrl/Cmd+クリック）

**エディタタブから送信**

- エディタタブで右クリック
- 使用したいCLIのコマンドを選択

**開いているファイルをすべて送信**

- エディタ内で右クリック
- "Gemini CLI: Send Open File Path" または "Codex CLI: Send Open File Path" を選択

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
- "Gemini CLI: Send Selected Text" または "Codex CLI: Send Selected Text"

**ファイル/フォルダパスの送信:**

- エクスプローラーで右クリック
- 使用したいCLI用のコマンドを選択
- 複数選択可能、フォルダも送信可能

**開いているすべてのファイルを送信:**

- エディタで右クリック
- 使用したいCLI用の "Send Open File Path" を選択

### ⌨️ コマンドパレット

全ての機能はコマンドパレットからも実行可能

- コマンドパレットを開く（`Cmd+Shift+P` / `Ctrl+Shift+P`）

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

**共通コマンド:**

- "Save to History" - 履歴を保存（すべてのターミナルで動作）

### ⌨️ カスタムキーボードショートカット

独自のキーバインディングを設定可能：

1. キーボードショートカットを開く: `Cmd+K Cmd+S`（Mac）または `Ctrl+K Ctrl+S`（Windows/Linux）
2. "Gemini CLI" または "Codex CLI" で検索
3. 鉛筆アイコンをクリックしてお好みのキーを割り当て

## 🆚 他の選択肢との比較

### 🎯 最適なユースケース

- **Claude CodeのUXが好きだがGeminiやGPT-5を使いたい**開発者
- ターミナルとエディタの切り替えに**うんざりしている**人

### 📊 比較表

| 機能 | Gemini CLI | この拡張 | Gemini Code Assist | Claude Code |
|------|-------------------|----------|--------------------------|----------------|
| **コード生成** | ✅ | ✅ | ✅ | ✅ |
| **エディタペインで動作** | ❌（ターミナル） | ✅ | ❌（サイドバー） | ✅ |
| **ワンクリック起動** | ❌ | ✅ | ✅ | ✅ |
| **ターミナルベースインターフェース** | ✅ | ✅ | ❌ | ✅ |
| **ファイルコンテキスト（@）** | ✅ | ✅ | ✅ | ✅ |
| **エディタテキストを送信** | ❌ | ✅ | ✅ | ❌ (別ターミナル) |
| **複数ファイル選択送信** | ❌ | ✅ | ✅ | ❌ |
| **ユニバーサル履歴** | ❌ | ✅ | ❌ | ❌ |
| **Geminiモデル対応** | ✅ | ✅ | ✅ | ❌ |
| **GPT-5モデル対応** | ❌ | ✅ | ❌ | ❌ |
| **複数CLI同時管理** | ❌ | ✅ | ❌ | ❌ |

## ⚙️ 設定オプション

### 利用可能な設定

```json
{
  // CLI機能の有効/無効
  "gemini-cli-vscode.gemini.enabled": true,
  "gemini-cli-vscode.codex.enabled": true,
  
  // コンテキストメニュー表示
  "gemini-cli-vscode.gemini.showInContextMenu": true,
  "gemini-cli-vscode.codex.showInContextMenu": false,
  
  // 履歴保存設定
  "gemini-cli-vscode.saveToHistory.showStatusBar": true,
  "gemini-cli-vscode.saveToHistory.includeTerminalName": true
}
```

設定の説明:

- `enabled`: CLIの機能とエディタタイトルバーアイコンの表示を制御
- `showInContextMenu`: 右クリックメニューでのコマンド表示を制御
- `saveToHistory.showStatusBar`: ステータスバーの「Save to History」ボタン表示
- `saveToHistory.includeTerminalName`: 履歴エントリにターミナル名を含める

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

この拡張機能によって起動した Gemini または Codex CLI フロー制御の問題を自動的に `stty -ixon` を適用して防止します。

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
