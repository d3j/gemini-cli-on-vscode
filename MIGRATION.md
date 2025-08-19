# Migration Guide - v0.2.1

## 🔄 Command Name Changes (Hierarchical Naming)

In v0.2.1, all CLI commands have been reorganized with a hierarchical naming structure for better consistency and future extensibility.

### Command Name Migration Table

| Old Command Name | New Command Name |
|-----------------|------------------|
| `gemini-cli-vscode.startInNewPane` | `gemini-cli-vscode.gemini.start.newPane` |
| `gemini-cli-vscode.startInActivePane` | `gemini-cli-vscode.gemini.start.activePane` |
| `gemini-cli-vscode.sendSelectedTextToGemini` | `gemini-cli-vscode.gemini.send.selectedText` |
| `gemini-cli-vscode.sendOpenFilePathToGemini` | `gemini-cli-vscode.gemini.send.openFiles` |
| `gemini-cli-vscode.sendFilePathToGemini` | `gemini-cli-vscode.gemini.send.filePath` |
| | |
| `gemini-cli-vscode.codexStartInNewPane` | `gemini-cli-vscode.codex.start.newPane` |
| `gemini-cli-vscode.codexStartInActivePane` | `gemini-cli-vscode.codex.start.activePane` |
| `gemini-cli-vscode.sendSelectedTextToCodex` | `gemini-cli-vscode.codex.send.selectedText` |
| `gemini-cli-vscode.sendOpenFilePathToCodex` | `gemini-cli-vscode.codex.send.openFiles` |
| `gemini-cli-vscode.sendFilePathToCodex` | `gemini-cli-vscode.codex.send.filePath` |
| | |
| `gemini-cli-vscode.claudeStartInNewPane` | `gemini-cli-vscode.claude.start.newPane` |
| `gemini-cli-vscode.claudeStartInActivePane` | `gemini-cli-vscode.claude.start.activePane` |
| `gemini-cli-vscode.sendSelectedTextToClaude` | `gemini-cli-vscode.claude.send.selectedText` |
| `gemini-cli-vscode.sendOpenFilePathToClaude` | `gemini-cli-vscode.claude.send.openFiles` |
| `gemini-cli-vscode.sendFilePathToClaude` | `gemini-cli-vscode.claude.send.filePath` |
| | |
| `gemini-cli-vscode.qwenStartInNewPane` | `gemini-cli-vscode.qwen.start.newPane` |
| `gemini-cli-vscode.qwenStartInActivePane` | `gemini-cli-vscode.qwen.start.activePane` |
| `gemini-cli-vscode.sendSelectedTextToQwen` | `gemini-cli-vscode.qwen.send.selectedText` |
| `gemini-cli-vscode.sendOpenFilePathToQwen` | `gemini-cli-vscode.qwen.send.openFiles` |
| `gemini-cli-vscode.sendFilePathToQwen` | `gemini-cli-vscode.qwen.send.filePath` |

### Unchanged Commands

The following commands remain unchanged:
- `gemini-cli-vscode.saveClipboardToHistory`
- `gemini-cli-vscode.launchAllCLIs`
- `gemini-cli-vscode.multiAI.openComposer`
- `gemini-cli-vscode.multiAI.askAll`

## 📌 Impact on Users

### For Most Users (Using UI)
**No action required!** If you use the extension through:
- Editor title bar buttons
- Context menus
- Command palette

Everything will continue to work automatically.

### For Users with Custom Keybindings

If you've set custom keyboard shortcuts, you'll need to update them:

1. Open Keyboard Shortcuts: `Cmd+K Cmd+S` (Mac) or `Ctrl+K Ctrl+S` (Windows/Linux)
2. Search for the old command name
3. Remove the old keybinding
4. Search for the new command name
5. Add your keybinding to the new command

**Example:**
- Old: Search for `gemini-cli-vscode.startInNewPane`
- New: Search for `gemini-cli-vscode.gemini.start.newPane`

### For Extension Developers

If you've built extensions or scripts that programmatically call these commands:

```typescript
// Old
await vscode.commands.executeCommand('gemini-cli-vscode.startInNewPane');

// New
await vscode.commands.executeCommand('gemini-cli-vscode.gemini.start.newPane');
```

## 🎯 Benefits of the New Structure

1. **Consistency**: All CLIs follow the same pattern: `extension.cli.action.target`
2. **Discoverability**: Easier to find related commands in the command palette
3. **Extensibility**: Ready for future features and new CLIs
4. **Organization**: Clear hierarchy makes the command structure more intuitive

## 📝 New Command Pattern

```
gemini-cli-vscode.{cli}.{action}.{target}

Where:
- {cli}: gemini, codex, claude, qwen
- {action}: start, send
- {target}: newPane, activePane, selectedText, filePath, openFiles
```

## 🆘 Need Help?

If you encounter any issues after the update:

1. Check if your custom keybindings need updating
2. Restart VS Code after the update
3. Report issues at: https://github.com/jparkrr/gemini-cli-on-vscode/issues

## 🔄 Rollback Option

If you need to rollback to the previous version temporarily:

1. Open Extensions view (`Cmd+Shift+X` or `Ctrl+Shift+X`)
2. Find "Gemini CLI on VSCode"
3. Click the gear icon → "Install Another Version..."
4. Select v0.2.0

Note: We recommend updating your keybindings instead of rolling back, as future updates will build on this new structure.