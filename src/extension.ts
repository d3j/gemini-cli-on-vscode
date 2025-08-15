import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileHandler } from './fileHandler';
import { PromptComposerViewProvider } from './multiAI/promptComposerView';

// CLI type definition
import { CLIType } from './types';

// Store active terminals for each CLI type
const geminiTerminals = new Map<string, vscode.Terminal>();
const codexTerminals = new Map<string, vscode.Terminal>();
const claudeTerminals = new Map<string, vscode.Terminal>();
const qwenTerminals = new Map<string, vscode.Terminal>();

// Status bar items
let saveHistoryStatusBarItem: vscode.StatusBarItem;

// Track if extension is already activated
let isActivated = false;
let composerViewRegistration: vscode.Disposable | undefined;

 

// Helper function to generate terminal key
function getTerminalKey(_location: any): string {
    // Use a single global key per CLI to prevent multiple terminals
    return 'global';
}

function getHistoryFilePath(): string | undefined {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return undefined;
    }
    
    // Use unified history-memo directory
    const historyDir = path.join(workspaceFolder.uri.fsPath, '.history-memo');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
    }
    
    // Use date as filename
    const dateStr = new Date().toISOString().split('T')[0];
    return path.join(historyDir, `${dateStr}.md`);
}



async function saveClipboardToHistory() {
    // Save original clipboard content
    const originalClipboard = await vscode.env.clipboard.readText();
    
    let textToSave: string | undefined;
    
    // Check if we're in terminal context
    const activeTerminal = vscode.window.activeTerminal;
    if (activeTerminal) {
        try {
            // Clear clipboard first to detect if selection exists
            await vscode.env.clipboard.writeText('');
            
            // Try to copy terminal selection
            await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
            
            // Wait for copy to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get the copied terminal text
            const terminalText = await vscode.env.clipboard.readText();
            
            // Check if we got new text from terminal (not empty string)
            if (terminalText && terminalText.length > 0) {
                textToSave = terminalText;
            }
        } catch {
            // If copy selection fails, restore clipboard
            console.error('Terminal copy selection failed');
        }
        
        // Restore original clipboard if no selection was found
        if (!textToSave && originalClipboard) {
            await vscode.env.clipboard.writeText(originalClipboard);
        }
    }
    
    // If no terminal text, try editor selection
    if (!textToSave) {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.selection && !editor.selection.isEmpty) {
            textToSave = editor.document.getText(editor.selection);
        }
    }
    
    if (!textToSave || textToSave.trim().length === 0) {
        vscode.window.showInformationMessage(
            'No text selected. Select text in terminal or editor first.'
        );
        // Restore original clipboard
        if (originalClipboard) {
            await vscode.env.clipboard.writeText(originalClipboard);
        }
        return;
    }
    
    const historyPath = getHistoryFilePath();
    if (!historyPath) {
        vscode.window.showErrorMessage('No workspace folder open');
        // Restore original clipboard
        if (originalClipboard) {
            await vscode.env.clipboard.writeText(originalClipboard);
        }
        return;
    }
    
    // Get configuration
    const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
    const includeTerminalName = config.get<boolean>('saveToHistory.includeTerminalName', true);
    
    // Format content with timestamp and optional terminal name
    const timestamp = new Date().toTimeString().split(' ')[0];
    const terminalForName = vscode.window.activeTerminal;
    const terminalName = includeTerminalName && terminalForName ? terminalForName.name : '';
    const header = terminalName 
        ? `\n## [${timestamp}] - ${terminalName}\n`
        : `\n## [${timestamp}]\n`;
    const content = textToSave.trim();
    const formattedContent = `${header}${content}\n`;
    
    // Create file with header if it doesn't exist
    if (!fs.existsSync(historyPath)) {
        const dateStr = new Date().toISOString().split('T')[0];
        const fileHeader = `# History Memo - ${dateStr}\n`;
        fs.writeFileSync(historyPath, fileHeader);
    }
    
    // Append to history file
    fs.appendFileSync(historyPath, formattedContent);
    
    // Restore original clipboard
    if (originalClipboard) {
        await vscode.env.clipboard.writeText(originalClipboard);
    }
    
    vscode.window.showInformationMessage('Saved to history');
}

async function sendSelectedToCLI(targetCLI?: CLIType) {
    let selectedText: string | undefined;
    
    // Only get text from editor selection - this function is for editor context only
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.selection && !editor.selection.isEmpty) {
        selectedText = editor.document.getText(editor.selection);
    }
    
    if (!selectedText || selectedText.trim().length === 0) {
        vscode.window.showInformationMessage(
            'No text selected in editor. Select text in editor first.'
        );
        return;
    }
    
    // Find active CLI terminal
    let activeTerminal: vscode.Terminal | undefined;
    let cliName = 'AI CLI';
    
    if (targetCLI === 'codex') {
        // Look for Codex terminal only
        for (const terminal of codexTerminals.values()) {
            if (vscode.window.terminals.includes(terminal)) {
                activeTerminal = terminal;
                cliName = 'Codex CLI';
                break;
            }
        }
    } else if (targetCLI === 'gemini') {
        // Look for Gemini terminal only
        for (const terminal of geminiTerminals.values()) {
            if (vscode.window.terminals.includes(terminal)) {
                activeTerminal = terminal;
                cliName = 'Gemini CLI';
                break;
            }
        }
    } else if (targetCLI === 'claude') {
        // Look for Claude terminal only
        for (const terminal of claudeTerminals.values()) {
            if (vscode.window.terminals.includes(terminal)) {
                activeTerminal = terminal;
                cliName = 'Claude Code';
                break;
            }
        }
    } else if (targetCLI === 'qwen') {
        // Look for Qwen terminal only
        for (const terminal of qwenTerminals.values()) {
            if (vscode.window.terminals.includes(terminal)) {
                activeTerminal = terminal;
                cliName = 'Qwen CLI';
                break;
            }
        }
    } else {
        // Check all terminals in priority order
        for (const terminal of claudeTerminals.values()) {
            if (vscode.window.terminals.includes(terminal)) {
                activeTerminal = terminal;
                cliName = 'Claude Code';
                break;
            }
        }
        
        if (!activeTerminal) {
            for (const terminal of codexTerminals.values()) {
                if (vscode.window.terminals.includes(terminal)) {
                    activeTerminal = terminal;
                    cliName = 'Codex CLI';
                    break;
                }
            }
        }
        
        if (!activeTerminal) {
            for (const terminal of geminiTerminals.values()) {
                if (vscode.window.terminals.includes(terminal)) {
                    activeTerminal = terminal;
                    cliName = 'Gemini CLI';
                    break;
                }
            }
        }
    }
    
    if (!activeTerminal) {
        const cliNames: Record<string, string> = {
            'codex': 'Codex',
            'gemini': 'Gemini',
            'claude': 'Claude Code',
            'qwen': 'Qwen'
        };
        const message = targetCLI 
            ? `${cliNames[targetCLI] || targetCLI} CLI is not running. Please start it first.`
            : 'No AI CLI is running. Please start Gemini, Codex, Claude, or Qwen CLI first.';
        vscode.window.showWarningMessage(message);
        return;
    }
    
    // Show terminal and send text
    activeTerminal.show();
    
    // Add a small delay to ensure terminal is focused
    setTimeout(async () => {
        // Copy text to clipboard
        await vscode.env.clipboard.writeText(selectedText!);
        
        // Use VS Code's paste command for terminal
        // This pastes without executing, even with newlines
        await vscode.commands.executeCommand('workbench.action.terminal.paste');
    }, 100);
    
    vscode.window.showInformationMessage(`Sent selected text to ${cliName}`);
}

function createOrFocusTerminal(
    context: vscode.ExtensionContext, 
    location: vscode.TerminalOptions['location'], 
    cliType: CLIType = 'gemini'
): vscode.Terminal {
    const terminals = cliType === 'qwen' ? qwenTerminals :
                     cliType === 'claude' ? claudeTerminals :
                     cliType === 'codex' ? codexTerminals : 
                     geminiTerminals;
    
    // Simple terminal key generation without sessionId
    const key = getTerminalKey(location);
    
    // Check existing terminal and clean up if it's no longer active
    const existingTerminal = terminals.get(key);
    if (existingTerminal) {
        // If terminal is disposed or has exit status, remove from map
        if (!vscode.window.terminals.includes(existingTerminal) || existingTerminal.exitStatus) {
            terminals.delete(key);
        } else {
            // Terminal is still active, reuse it
            existingTerminal.show();
            return existingTerminal;
        }
    }
    
    // CLI configuration
    const cliConfig = {
        gemini: { name: 'Gemini CLI', command: 'gemini', icon: 'icon.png' },
        codex: { name: 'Codex CLI', command: 'codex', icon: 'codex-icon.png' },
        claude: { name: 'Claude Code', command: 'claude', icon: 'claude-logo.png' },
        qwen: { name: 'Qwen CLI', command: 'qwen', icon: 'qwen-color.svg' }
    };
    
    const cfg = cliConfig[cliType];
    const iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', cfg.icon);
    
    const terminal = vscode.window.createTerminal({
        name: cfg.name,  // Simple name without sessionId
        location: location,
        iconPath: iconPath,
        isTransient: true,  // Prevent terminal persistence on restart
        hideFromUser: false,  // Show in terminal dropdown but don't persist
        env: {}  // Clean environment to prevent restoration
    });
    
    // Store the new terminal
    terminals.set(key, terminal);
    
    // Get configuration for terminal workarounds
    const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
    const disableFlowControl = config.get<boolean>('terminal.disableFlowControl', true);
    
    // Apply terminal workarounds if enabled
    if (disableFlowControl) {
        // Disable XON/XOFF flow control to prevent Ctrl+S from freezing output
        terminal.sendText('stty -ixon 2>/dev/null');
    }
    
    // Navigate to workspace folder if available
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const workspacePath = workspaceFolder.uri.fsPath;
        // Use quotes to handle paths with spaces
        terminal.sendText(`cd "${workspacePath}"`);
    }
    
    // Launch the CLI
    terminal.sendText(cfg.command);
    terminal.show();

    return terminal;
}

async function launchAllCLIs(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
    
    // Pre-validation
    const clis = config.get<string[]>('multiAI.launch.clis', ['claude', 'gemini', 'codex']);
    const enabledCLIs = clis.filter(cli => 
        config.get<boolean>(`${cli}.enabled`, true)
    ) as CLIType[];
    
    if (enabledCLIs.length === 0) {
        vscode.window.showWarningMessage('No CLIs are enabled. Please check your settings.');
        return;
    }
    
    // Progress display
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Launching all CLIs...',
        cancellable: false
    }, async (progress) => {
        // Get the current active editor's view column to place terminals in the same group
        const activeEditor = vscode.window.activeTextEditor;
        const targetColumn = activeEditor?.viewColumn || vscode.ViewColumn.One;
        
        // Create location for editor area (not terminal panel)
        const location: vscode.TerminalOptions['location'] = { 
            viewColumn: targetColumn,
            preserveFocus: false
        };
        
        for (let i = 0; i < enabledCLIs.length; i++) {
            const cliType = enabledCLIs[i];
            progress.report({ 
                increment: (100 / enabledCLIs.length),
                message: `Starting ${cliType}...`
            });
            
            createOrFocusTerminal(context, location, cliType);
            
            // Launch interval (reduce load)
            if (i < enabledCLIs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    });
    
    vscode.window.showInformationMessage(
        `✓ Launched ${enabledCLIs.length} CLIs: ${enabledCLIs.join(', ')}`
    );
}

function sendOpenFilesToCLI(targetCLI?: CLIType): Promise<void> {
    return new Promise((resolve) => {
        // Find active CLI terminal
        let activeTerminal: vscode.Terminal | undefined;
        let cliName = 'AI CLI';
        
        if (targetCLI === 'codex') {
            // Look for Codex terminal only
            for (const terminal of codexTerminals.values()) {
                if (vscode.window.terminals.includes(terminal)) {
                    activeTerminal = terminal;
                    cliName = 'Codex CLI';
                    break;
                }
            }
        } else if (targetCLI === 'gemini') {
            // Look for Gemini terminal only
            for (const terminal of geminiTerminals.values()) {
                if (vscode.window.terminals.includes(terminal)) {
                    activeTerminal = terminal;
                    cliName = 'Gemini CLI';
                    break;
                }
            }
        } else if (targetCLI === 'claude') {
            // Look for Claude terminal only
            for (const terminal of claudeTerminals.values()) {
                if (vscode.window.terminals.includes(terminal)) {
                    activeTerminal = terminal;
                    cliName = 'Claude Code';
                    break;
                }
            }
        } else if (targetCLI === 'qwen') {
            // Look for Qwen terminal only
            for (const terminal of qwenTerminals.values()) {
                if (vscode.window.terminals.includes(terminal)) {
                    activeTerminal = terminal;
                    cliName = 'Qwen CLI';
                    break;
                }
            }
        } else {
            // Check all terminals in priority order
            for (const terminal of claudeTerminals.values()) {
                if (vscode.window.terminals.includes(terminal)) {
                    activeTerminal = terminal;
                    cliName = 'Claude Code';
                    break;
                }
            }
            
            if (!activeTerminal) {
                for (const terminal of codexTerminals.values()) {
                    if (vscode.window.terminals.includes(terminal)) {
                        activeTerminal = terminal;
                        cliName = 'Codex CLI';
                        break;
                    }
                }
            }
            
            if (!activeTerminal) {
                for (const terminal of geminiTerminals.values()) {
                    if (vscode.window.terminals.includes(terminal)) {
                        activeTerminal = terminal;
                        cliName = 'Gemini CLI';
                        break;
                    }
                }
            }
        }
        
        if (!activeTerminal) {
            const cliNames: Record<string, string> = {
                'codex': 'Codex',
                'gemini': 'Gemini',
                'claude': 'Claude Code',
                'qwen': 'Qwen'
            };
            const message = targetCLI 
                ? `${cliNames[targetCLI] || targetCLI} CLI is not running. Please start it first.`
                : 'No AI CLI is running. Please start Gemini, Codex, Claude, or Qwen CLI first.';
            vscode.window.showWarningMessage(message);
            resolve();
            return;
        }
        
        // Get all open files
        const openFiles = vscode.window.tabGroups.all
            .flatMap(group => group.tabs)
            .filter(tab => tab.input instanceof vscode.TabInputText)
            .map(tab => {
                const uri = (tab.input as vscode.TabInputText).uri;
                return vscode.workspace.asRelativePath(uri);
            });
        
        if (openFiles.length === 0) {
            vscode.window.showInformationMessage('No files are currently open.');
            resolve();
            return;
        }
        
        const filesText = `@${openFiles.join(' @')} `; // Add trailing space
        
        // Send to terminal
        activeTerminal.show();
        
        // Small delay to ensure terminal is focused and ready
        setTimeout(() => {
            activeTerminal!.sendText(filesText, false);
            resolve();
        }, 100);
        
        vscode.window.showInformationMessage(`Sent ${openFiles.length} file(s) to ${cliName}`);
    });
}



function createStatusBarItems(context: vscode.ExtensionContext) {
    // Create status bar item for Save to History
    saveHistoryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    saveHistoryStatusBarItem.command = 'gemini-cli-vscode.saveClipboardToHistory';
    saveHistoryStatusBarItem.text = '$(save) Save to History';
    saveHistoryStatusBarItem.tooltip = 'Save terminal/editor selection to history';
    context.subscriptions.push(saveHistoryStatusBarItem);
}

function updateStatusBarVisibility() {
    // Get configuration
    const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
    const showStatusBar = config.get<boolean>('saveToHistory.showStatusBar', true);
    
    // Don't show if disabled in settings
    if (!showStatusBar) {
        saveHistoryStatusBarItem.hide();
        return;
    }
    
    const activeEditor = vscode.window.activeTextEditor;
    const activeTerminal = vscode.window.activeTerminal;
    
    // Show when any terminal is active (not editor)
    if (!activeEditor && activeTerminal) {
        saveHistoryStatusBarItem.show();
    } else {
        saveHistoryStatusBarItem.hide();
    }
}

export function activate(context: vscode.ExtensionContext) {
    
    // Prevent duplicate activation
    if (isActivated) {
        return;
    }
    isActivated = true;
    
    // Clean up any ghost terminals from previous sessions
    const cliNames = ['Gemini CLI', 'Codex CLI', 'Claude Code', 'Qwen CLI'];
    vscode.window.terminals.forEach(terminal => {
        // Check if this is a ghost terminal from our extension
        if (cliNames.includes(terminal.name) && !terminal.exitStatus) {
            // If terminal has no process ID or is in a weird state, dispose it
            const pidPromise = terminal.processId;
            if (pidPromise && typeof pidPromise.then === 'function') {
                (pidPromise as Promise<number | undefined>).then(pid => {
                    if (!pid) {
                        terminal.dispose();
                    }
                }).catch(() => {
                    // If we can't get process ID, it's likely a ghost terminal
                    terminal.dispose();
                });
            }
        }
    });
    
    // Create status bar items
    createStatusBarItems(context);
    
    // Create FileHandler instance with all terminal maps
    const fileHandler = new FileHandler(geminiTerminals, codexTerminals, claudeTerminals, qwenTerminals);

    // Register Sidebar Prompt Composer view provider
    const composerViewProvider = new PromptComposerViewProvider(context, fileHandler);
    composerViewRegistration = vscode.window.registerWebviewViewProvider(PromptComposerViewProvider.viewId, composerViewProvider);
    context.subscriptions.push(composerViewRegistration);
    
    // Check configuration
    const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
    const geminiEnabled = config.get<boolean>('gemini.enabled', true);
    const codexEnabled = config.get<boolean>('codex.enabled', true);
    const claudeEnabled = config.get<boolean>('claude.enabled', true);
    const qwenEnabled = config.get<boolean>('qwen.enabled', false);
    
    // Gemini CLI commands
    const startInNewPane = vscode.commands.registerCommand('gemini-cli-vscode.startInNewPane', () => {
        if (!geminiEnabled) {
            vscode.window.showWarningMessage('Gemini CLI is disabled in settings.');
            return;
        }
        createOrFocusTerminal(context, { viewColumn: vscode.ViewColumn.Beside }, 'gemini');
        updateStatusBarVisibility();
    });
    
    const startInActivePane = vscode.commands.registerCommand('gemini-cli-vscode.startInActivePane', () => {
        if (!geminiEnabled) {
            vscode.window.showWarningMessage('Gemini CLI is disabled in settings.');
            return;
        }
        createOrFocusTerminal(context, { viewColumn: vscode.ViewColumn.Active }, 'gemini');
        updateStatusBarVisibility();
    });
    
    // Codex CLI commands
    const codexStartInNewPane = vscode.commands.registerCommand('gemini-cli-vscode.codexStartInNewPane', () => {
        if (!codexEnabled) {
            vscode.window.showWarningMessage('Codex CLI is disabled in settings.');
            return;
        }
        createOrFocusTerminal(context, { viewColumn: vscode.ViewColumn.Beside }, 'codex');
        updateStatusBarVisibility();
    });
    
    const codexStartInActivePane = vscode.commands.registerCommand('gemini-cli-vscode.codexStartInActivePane', () => {
        if (!codexEnabled) {
            vscode.window.showWarningMessage('Codex CLI is disabled in settings.');
            return;
        }
        createOrFocusTerminal(context, { viewColumn: vscode.ViewColumn.Active }, 'codex');
        updateStatusBarVisibility();
    });
    
    // Save to history command
    const saveClipboard = vscode.commands.registerCommand('gemini-cli-vscode.saveClipboardToHistory', async () => {
        await saveClipboardToHistory();
    });
    
    // Gemini-specific send commands
    const sendSelectedTextToGemini = vscode.commands.registerCommand('gemini-cli-vscode.sendSelectedTextToGemini', async () => {
        await sendSelectedToCLI('gemini');
    });
    
    const sendOpenFilePathToGemini = vscode.commands.registerCommand('gemini-cli-vscode.sendOpenFilePathToGemini', () => {
        return sendOpenFilesToCLI('gemini');
    });
    
    const sendFilePathToGemini = vscode.commands.registerCommand('gemini-cli-vscode.sendFilePathToGemini', async (uri: vscode.Uri, uris?: vscode.Uri[]) => {
        if (uris && uris.length > 0) {
            await fileHandler.sendFilesToTerminal(uris, 'gemini');
        } else if (uri) {
            await fileHandler.sendFilesToTerminal(uri, 'gemini');
        } else {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await fileHandler.sendFilesToTerminal(activeEditor.document.uri, 'gemini');
            } else {
                vscode.window.showWarningMessage('No file selected');
            }
        }
    });
    
    // Codex-specific send commands
    const sendSelectedTextToCodex = vscode.commands.registerCommand('gemini-cli-vscode.sendSelectedTextToCodex', async () => {
        await sendSelectedToCLI('codex');
    });
    
    const sendOpenFilePathToCodex = vscode.commands.registerCommand('gemini-cli-vscode.sendOpenFilePathToCodex', () => {
        return sendOpenFilesToCLI('codex');
    });
    
    const sendFilePathToCodex = vscode.commands.registerCommand('gemini-cli-vscode.sendFilePathToCodex', async (uri: vscode.Uri, uris?: vscode.Uri[]) => {
        if (uris && uris.length > 0) {
            await fileHandler.sendFilesToTerminal(uris, 'codex');
        } else if (uri) {
            await fileHandler.sendFilesToTerminal(uri, 'codex');
        } else {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await fileHandler.sendFilesToTerminal(activeEditor.document.uri, 'codex');
            } else {
                vscode.window.showWarningMessage('No file selected');
            }
        }
    });
    
    // Claude CLI commands
    const claudeStartInNewPane = vscode.commands.registerCommand('gemini-cli-vscode.claudeStartInNewPane', () => {
        if (!claudeEnabled) {
            vscode.window.showWarningMessage('Claude Code CLI is disabled in settings.');
            return;
        }
        createOrFocusTerminal(context, { viewColumn: vscode.ViewColumn.Beside }, 'claude');
        updateStatusBarVisibility();
    });
    
    const claudeStartInActivePane = vscode.commands.registerCommand('gemini-cli-vscode.claudeStartInActivePane', () => {
        if (!claudeEnabled) {
            vscode.window.showWarningMessage('Claude Code CLI is disabled in settings.');
            return;
        }
        createOrFocusTerminal(context, { viewColumn: vscode.ViewColumn.Active }, 'claude');
        updateStatusBarVisibility();
    });
    
    // Claude-specific send commands
    const sendSelectedTextToClaude = vscode.commands.registerCommand('gemini-cli-vscode.sendSelectedTextToClaude', async () => {
        await sendSelectedToCLI('claude');
    });
    
    const sendOpenFilePathToClaude = vscode.commands.registerCommand('gemini-cli-vscode.sendOpenFilePathToClaude', () => {
        return sendOpenFilesToCLI('claude');
    });
    
    const sendFilePathToClaude = vscode.commands.registerCommand('gemini-cli-vscode.sendFilePathToClaude', async (uri: vscode.Uri, uris?: vscode.Uri[]) => {
        if (uris && uris.length > 0) {
            await fileHandler.sendFilesToTerminal(uris, 'claude');
        } else if (uri) {
            await fileHandler.sendFilesToTerminal(uri, 'claude');
        } else {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await fileHandler.sendFilesToTerminal(activeEditor.document.uri, 'claude');
            } else {
                vscode.window.showWarningMessage('No file selected');
            }
        }
    });
    
    // Qwen CLI commands
    const qwenStartInNewPane = vscode.commands.registerCommand('gemini-cli-vscode.qwenStartInNewPane', () => {
        if (!qwenEnabled) {
            vscode.window.showWarningMessage('Qwen CLI is disabled in settings.');
            return;
        }
        createOrFocusTerminal(context, { viewColumn: vscode.ViewColumn.Beside }, 'qwen');
        updateStatusBarVisibility();
    });
    
    const qwenStartInActivePane = vscode.commands.registerCommand('gemini-cli-vscode.qwenStartInActivePane', () => {
        if (!qwenEnabled) {
            vscode.window.showWarningMessage('Qwen CLI is disabled in settings.');
            return;
        }
        createOrFocusTerminal(context, { viewColumn: vscode.ViewColumn.Active }, 'qwen');
        updateStatusBarVisibility();
    });
    
    // Qwen-specific send commands
    const sendSelectedTextToQwen = vscode.commands.registerCommand('gemini-cli-vscode.sendSelectedTextToQwen', async () => {
        await sendSelectedToCLI('qwen');
    });
    
    const sendOpenFilePathToQwen = vscode.commands.registerCommand('gemini-cli-vscode.sendOpenFilePathToQwen', () => {
        return sendOpenFilesToCLI('qwen');
    });
    
    const sendFilePathToQwen = vscode.commands.registerCommand('gemini-cli-vscode.sendFilePathToQwen', async (uri: vscode.Uri, uris?: vscode.Uri[]) => {
        if (uris && uris.length > 0) {
            await fileHandler.sendFilesToTerminal(uris, 'qwen');
        } else if (uri) {
            await fileHandler.sendFilesToTerminal(uri, 'qwen');
        } else {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await fileHandler.sendFilesToTerminal(activeEditor.document.uri, 'qwen');
            } else {
                vscode.window.showWarningMessage('No file selected');
            }
        }
    });
    
    // Multi-CLI command
    const launchAllCLIsCmd = vscode.commands.registerCommand('gemini-cli-vscode.launchAllCLIs', () => {
        launchAllCLIs(context);
    });
    
    // Multi AI commands - reuse existing fileHandler instance
    const openComposerCmd = vscode.commands.registerCommand('gemini-cli-vscode.multiAI.openComposer', async () => {
        // Always focus the sidebar view (MAGUS Council)
        try {
            await vscode.commands.executeCommand('workbench.view.extension.gemini-cli-vscode');
        } catch {
            // ignore
        }
        try {
            await vscode.commands.executeCommand('gemini-cli-vscode.promptComposerView.focus');
        } catch {
            // ignore
        }
    });

    
    const askAllCmd = vscode.commands.registerCommand('gemini-cli-vscode.multiAI.askAll', async () => {
        // Open the sidebar-based composer
        await vscode.commands.executeCommand('gemini-cli-vscode.multiAI.openComposer');
    });
    
    // Update status bar visibility when terminal or editor changes
    vscode.window.onDidChangeActiveTerminal(() => {
        updateStatusBarVisibility();
    });
    
    vscode.window.onDidOpenTerminal(() => {
        updateStatusBarVisibility();
    });
    
    vscode.window.onDidChangeActiveTextEditor(() => {
        updateStatusBarVisibility();
    });
    
    // Clean up terminals map when terminals are closed
    vscode.window.onDidCloseTerminal((terminal) => {
        geminiTerminals.forEach((value, key) => {
            if (value === terminal) {
                geminiTerminals.delete(key);
            }
        });
        codexTerminals.forEach((value, key) => {
            if (value === terminal) {
                codexTerminals.delete(key);
            }
        });
        claudeTerminals.forEach((value, key) => {
            if (value === terminal) {
                claudeTerminals.delete(key);
            }
        });
        qwenTerminals.forEach((value, key) => {
            if (value === terminal) {
                qwenTerminals.delete(key);
            }
        });
        updateStatusBarVisibility();
    });
    
    // Initial visibility update
    updateStatusBarVisibility();

    // No startup editor-group cleanup
    
    context.subscriptions.push(
        startInNewPane, 
        startInActivePane,
        codexStartInNewPane,
        codexStartInActivePane,
        claudeStartInNewPane,
        claudeStartInActivePane,
        qwenStartInNewPane,
        qwenStartInActivePane,
        saveClipboard,
        sendSelectedTextToGemini,
        sendSelectedTextToCodex,
        sendSelectedTextToClaude,
        sendSelectedTextToQwen,
        sendOpenFilePathToGemini,
        sendOpenFilePathToCodex,
        sendOpenFilePathToClaude,
        sendOpenFilePathToQwen,
        sendFilePathToGemini,
        sendFilePathToCodex,
        sendFilePathToClaude,
        sendFilePathToQwen,
        launchAllCLIsCmd,
        openComposerCmd,
        askAllCmd
    );
}

export function deactivate() {
    // Dispose active terminals before clearing maps
    geminiTerminals.forEach((terminal) => {
        if (terminal && !terminal.exitStatus) {
            terminal.dispose();
        }
    });
    codexTerminals.forEach((terminal) => {
        if (terminal && !terminal.exitStatus) {
            terminal.dispose();
        }
    });
    claudeTerminals.forEach((terminal) => {
        if (terminal && !terminal.exitStatus) {
            terminal.dispose();
        }
    });
    qwenTerminals.forEach((terminal) => {
        if (terminal && !terminal.exitStatus) {
            terminal.dispose();
        }
    });
    
    // Clear terminals map on deactivation
    geminiTerminals.clear();
    codexTerminals.clear();
    qwenTerminals.clear();
    
    // Dispose registered webview provider and status bar
    try {
        composerViewRegistration?.dispose();
        composerViewRegistration = undefined;
    } catch (error) {
        console.error('Error disposing composer view registration:', error);
    }
    try {
        saveHistoryStatusBarItem?.dispose();
    } catch (error) {
        console.error('Error disposing status bar item:', error);
    }
    
    // Allow re-activation in tests
    isActivated = false;
    claudeTerminals.clear();

    // No editor-group cleanup on exit
}
