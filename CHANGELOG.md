# Changelog

All notable changes to this project will be documented in this file.

## [0.0.7] - 2025-08-09

### Fixed

- Fixed multiline text sending in "Send Selected Text" command - now pastes without auto-execution, allowing users to edit before running

## [0.0.6] - 2025-08-08

### Added

*   **Codex CLI Support** - Launch OpenAI's Codex CLI (with GPT-5 support) in editor panes
    *   "Codex CLI: Start in New Pane"
    *   "Codex CLI: Start in Active Pane"
*   **Universal Save to History** - Works with all terminals, not just AI CLIs
    *   Unified history location: `.history-memo/`
    *   Terminal name included in history entries (configurable)
    *   History files use "History Memo" format for daily work logs
*   **Separate Commands for Each CLI** - Direct control over which AI receives content
    *   Gemini-specific: Send Selected Text, Send File Path, Send Open File Path
    *   Codex-specific: Send Selected Text, Send File Path, Send Open File Path
*   **Configuration Settings** - Comprehensive control over features
    *   `gemini-cli-vscode.gemini.enabled` - Enable/disable Gemini CLI
    *   `gemini-cli-vscode.codex.enabled` - Enable/disable Codex CLI
    *   `gemini-cli-vscode.gemini.showInContextMenu` - Show/hide Gemini commands in context menus
    *   `gemini-cli-vscode.codex.showInContextMenu` - Show/hide Codex commands in context menus
    *   `gemini-cli-vscode.saveToHistory.showStatusBar` - Control status bar visibility
    *   `gemini-cli-vscode.saveToHistory.includeTerminalName` - Include terminal name in history entries

### Changed

*   Editor title bar icons now controlled by `enabled` settings for cleaner interface
*   FileHandler now accepts target CLI parameter for directed sending
*   Context menu items only show when enabled in settings
*   Status bar "Save to History" appears for any active terminal
*   Improved terminal selection detection to prevent duplicate history entries


### Technical

*   First VS Code extension to support both Gemini and Codex CLI in editor panes
*   Released one day after GPT-5 announcement for immediate support
*   Multiple CLI management with smart terminal identification
*   Better separation of concerns between different AI CLIs

## [0.0.5] - 2025-08-08

### Added

*   Send file/folder paths to Gemini CLI - Right-click any file or folder in explorer
*   Multiple file selection support - Select multiple files/folders and send at once
*   Editor tab context menu - Right-click editor tabs to send file paths
*   Automatic path quoting for files with spaces or non-ASCII characters
*   Support for sending folder paths in addition to files

### Changed

*   Renamed commands for clarity:
    *   "Send File Path" - Send selected file/folder paths
    *   "Send Open File Path" - Send all open file paths
    *   "Send Selected Text" - Send selected text from editor
*   All send operations now add trailing space without Enter key
*   Improved relative path handling for better usability
*   Enhanced error messages using consistent warning dialogs

### Fixed

*   Path concatenation issue when sending multiple times
*   Proper handling of paths with spaces and special characters
*   Terminal text sending no longer auto-executes commands

## [0.0.4] - 2025-08-07

### Added

*   Manual history saving feature - Save Gemini CLI conversations to `.gemini-history/YYYY-MM-DD.md`
*   Send selected text directly to Gemini CLI from the editor
*   Command "Save to History" accessible from status bar
*   Right-click context menu option to send selected text to Gemini

### Changed

*   Enhanced editor integration for seamless workflow
*   Improved file organization with `.gemini-history` folder for conversation logs

## [0.0.3] - 2025-08-07

### Added

*   Send open files feature - Automatically share open file names with Gemini CLI
*   Claude Code-like experience with enhanced file context awareness
*   Right-click context menu option to send open file information

## [0.0.2] - 2025-08-06

### Added

*   Smart terminal management - Focus existing Gemini CLI instead of creating duplicates
*   Auto-navigation - Automatically cd to workspace folder on launch
*   Custom keybindings support - Users can set their own keyboard shortcuts
*   Bilingual README support (English/Japanese)

### Changed

*   Improved terminal reuse behavior for better resource management
*   Enhanced user experience with automatic workspace directory navigation

## [0.0.1] - 2025-08-05

### Added

*   Initial release of the "Gemini CLI on VSCode" extension.
*   Command to launch Gemini CLI in a new editor pane.
*   Command to launch Gemini CLI in the active editor pane.
*   Icon in the editor title bar to launch in a new pane.
