# Changelog

All notable changes to this project will be documented in this file.

## [0.4.0] - 2025-09-11

### 🎉 Major Feature: Templates Panel

- New “Templates” view in the MAGUS Council sidebar (enable via `gemini-cli-vscode.templates.enabled`).
- Accordion UI (single-expand): click a title to expand → preview → insert inline.
  - Insert positions: [Head] / [Cursor] / [Tail] / [Replace]
  - Uses `composer/insertTemplate` → Composer `composer/insert` for safe text insertion.
- Incremental search with inline toggle [×/⟳]
  - [×] clears when input is non-empty; [⟳] refreshes when input is empty.
- Preview is generated lazily on expand and cached; shown with CSP/DOMPurify sanitization.

### Added
- Templates view in the MAGUS Council sidebar with accordion UI, preview, and Head/Cursor/Tail/Replace insertion.
- Template sources: shared (`.magus-templates/shared`), history (latest day only; H1 sections), and user files via `gemini-cli-vscode.templates.files` (H1 split).
- TemplateService / RenderEngine / front-matter parser and IPC endpoints (`templates/*`, `composer/insertTemplate`).
- Settings: `templates.enabled`, `templates.sources.shared.enabled`, `templates.sources.shared.path`, `templates.files`.
- Unit tests for templates, render engine, and history/user sources.

### Changed
- History format: each entry saved as H1 `# [HH:MM:SS] ...`; no per-file top header for new files. Old files remain unchanged.

### Docs
- Updated templates documentation and Settings descriptions

## [0.3.1] - 2025-08-22

### Added

- **MAGUS Council: Send Selected Text** 📝
  - New command `multiAI.send.selectedText` to send editor selection to MAGUS Council Composer

- **MAGUS Council: Send File Path** 📁
  - New command `multiAI.send.filePath` to send file/folder paths to MAGUS Council Composer
  - Explorer context menu integration for quick file sharing

### Fixed

- **Layout Stability** 📐
  - Fixed prompt box text position shift when scrollbar appears in MAGUS Council sidebar
  - Implemented `scrollbar-gutter: stable` to reserve scrollbar space
  - Applied to both container and textarea elements for consistent layout

- **Clipboard Protection** 📋
  - Fixed clipboard content loss when using Send Selected Text feature
  - Added clipboard backup and restore mechanism with exception safety
  - Implemented conditional restore to respect user's clipboard changes
  - Unified clipboard handling across `sendTextToTerminal` and `pasteAndEnter` methods

## [0.3.0] - 2025-08-20

### Summary

Feature release with customizable history timestamps and comprehensive internal refactoring.
**Breaking change**: Command names have changed

### Changed

- **Hierarchical Command Naming** 🔄
  - All CLI commands now follow `{extension}.{cli}.{action}.{target}` pattern
  - Example: `gemini-cli-vscode.gemini.start.newPane` (was `startInNewPane`)
  - See [MIGRATION.md](./MIGRATION.md) for complete command mapping

- **Migration Notification** 🔔
  - Automatic detection of custom keybindings using old command names
  - User-friendly notification with migration guide link

### Added

- **Customizable History Timestamps** 🕐
  - Local timezone support for history files
  - Custom day boundary configuration (e.g., "02:00" for night shift)
  - Terminal name inclusion in history entries
  - New DateCalculator service for flexible date handling

### Improved

- **Editor Title Bar Buttons** 🔧
  - Corrected initialization order to show buttons immediately

- **Architecture** 🏗️
  - Modular design with 76% code reduction
  - 179 tests with full coverage
  - Enhanced documentation for end users
  - Dependency injection pattern implementation
  - Clean separation of concerns

- **Test Coverage** 🧪
  - Complete refactoring without breaking changes
  - Enhanced test environment with VS Code extension-optimized coverage

## [0.2.0] - 2025-08-17

### Added

- **Settings UI Reorganization** 🎨
  - Two-tier configuration structure: Standard and Advanced
  - Standard settings reduced to 7 essential decisions
  - All CLI command/args now configurable for all AI types
  - Context menu action-level toggles (Send Text / Send File Path)

- **CLI Registry Architecture** 🏗️
  - Centralized CLI configuration management
  - Dynamic reload on settings change
  - Type-safe API for CLI operations
  - Foundation for future plugin architecture

- **Improved Settings Migration** 🔄
  - Automatic settings migration on extension activation
  - Preserves existing user customizations
  - Safe error handling ensures extension continues working

### Changed

- **Terminal Behavior**
  - Added `terminal.groupingBehavior` for better multi-CLI management
  - Improved handling of terminal delays

### Improved

- **Configuration UX**
  - Enhanced markdown descriptions with examples
  - Logical ordering with order attributes
  - Clear dependency relationships in descriptions
  - Emoji indicators for better visual scanning

### Fixed

- **Settings Compatibility**
  - Improved handling of settings from previous versions
  - Better fallback for missing configuration values
  - Extension continues working even with incomplete settings

## [0.1.1] - 2025-08-15

### Fixed

- **Critical: MAGUS Council CSS Loading Issue** 🚨
  - Fixed missing CSS file that prevented MAGUS Council from rendering properly
  - MAGUS Council panel now displays correctly with proper UI styling

### Added

- **Qwen CLI Support (Beta)** 🐉
  - New CLI integration for Qwen (通义千问) - Beta release
  - Full feature parity with other CLIs (Gemini, Claude, Codex)
  - MAGUS Council now supports 4 AI agents simultaneously
  - Configurable via `gemini-cli-vscode.qwen.enabled` setting (default: false)
  - Note: This feature is in beta and may have limitations

### Improved

- **Architecture Enhancement**
  - Introduced CLIRegistry for centralized CLI configuration management
  - Extracted CLI types to dedicated types.ts module
  - Better separation of concerns with modular design
  - Dynamic CLI configuration loading with hot-reload support

- **MAGUS Council UI**
  - Added Qwen CLI to multi-AI composer interface
  - Updated agent selection toggles to support 4 agents

### Technical Details

- Added `src/cliRegistry.ts` - Centralized CLI configuration management
- Added `src/types.ts` - Shared type definitions
- Updated all terminal management to support 4 CLI types
- Extended broadcast functionality to include Qwen CLI
- Added comprehensive unit tests for new components

## [0.1.0] - 2025-08-15

### 🎉 Major Feature: MAGUS Council

- **MAGUS Council** - Multiple Agent Guidance & Intelligence System 🔮
  - Three Wise Men Protocol: Coordinate Gemini, Claude, and Codex in perfect synchronization
  - Interactive sidebar for unified AI management
  - Broadcast prompts to multiple AI CLIs simultaneously
  - Smart CLI-specific execution with configurable delays

### Added

- **Commands**
  - `multiAI.openComposer` - Opens MAGUS Council sidebar
  - `multiAI.askAll` - Broadcasts to selected AI agents
- **Icon**: New Council icon for multi-AI features
- **Settings**: Configurable execution delays
  - `multiAI.composer.delays.initial` (default: 100ms)
  - `multiAI.composer.delays.claude.enter` (default: 150ms)
  - `multiAI.composer.delays.gemini.enter` (default: 600ms)


### Improved

- **Terminal Management**
  - Single instance per AI type with automatic reuse
  - Consistent behavior across all launch methods
  - Clean shutdown with transient terminals (no ghost terminals)
  
- **Test Suite**
  - Complete migration to BDD format (describe/it)
  - Enhanced test helpers for stability

### Changed

- Organized settings under `composer.delays` hierarchy

### Fixed

- Terminal persistence issue - no more ghost terminals after restart
- Error logging improved (`console.log` → `console.error`)
- Promise-based file operations for reliability
- CLI-specific execution timing optimized
- "All according to scenario" - comprehensive test coverage

## [0.0.8] - 2025-08-11

### Added

- **Claude Code CLI Support** 🎨
  - Complete integration with Claude Code CLI
  - Launch Claude Code in new or active pane  
  - Send files, folders, and selected text to Claude
  - Full parity with existing Gemini and Codex features
  - Professional Claude logo in terminal tabs

- **Launch All CLIs Command** ⚡
  - One-click launch for all configured CLIs simultaneously
  - Smart placement in editor area (not terminal panel)
  - Progress notification during launch
  - Configurable CLI selection via settings
  - Command: `Launch All CLIs`
  - Settings: `multiAI.launch.clis` to customize which CLIs to launch

### Improved

- **Performance Optimizations**
  - Staggered launch timing (200ms intervals) to reduce system load
  - Better terminal placement logic for multi-CLI scenarios
  - Enhanced progress reporting during batch operations

- **Code Quality**
  - Test suite expanded with Claude CLI test coverage
  - Mock objects enhanced for better test isolation
  - Terminal management code refactored for three-CLI support

### Fixed

- Terminal placement when launching multiple CLIs
- Progress notification display during batch operations
- Test helper compatibility with VS Code's clipboard API

## [0.0.7] - 2025-08-06

### Added

- **Status Bar Feature** 📋
  - "Save to History" button in status bar when terminal is active
  - Intelligent visibility: Shows only in terminal context
  - Quick access to clipboard/selection saving
  - Configurable via `saveToHistory.showStatusBar` setting

- **Configuration Options**
  - `saveToHistory.includeTerminalName`: Include terminal name in history (default: true)
  - `saveToHistory.showStatusBar`: Show status bar item (default: true)
  - `terminal.disableFlowControl`: Disable XON/XOFF flow control (default: true)

### Improved

- **Terminal Selection Behavior**
  - Smart copy from terminal selection
  - Preserves original clipboard when no selection
  - Better handling of terminal vs editor context

- **Flow Control Management**
  - Automatic `stty -ixon` to prevent Ctrl+S freezing
  - Configurable per-workspace needs
  - Applied before CLI launch for consistency

- **Testing Infrastructure**
  - Mock clipboard for reliable tests
  - Enhanced terminal selection test coverage
  - Better error handling in test environment

### Fixed

- Terminal flow control issues (Ctrl+S no longer freezes output)
- Clipboard preservation when no text selected
- Empty selection edge cases

## Previous versions...
