import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileHandler } from './fileHandler';

// Store active Gemini CLI terminals
const geminiTerminals = new Map<string, vscode.Terminal>();

// Status bar items
let saveHistoryStatusBarItem: vscode.StatusBarItem;

// Track if extension is already activated
let isActivated = false;

function getHistoryFilePath(): string | undefined {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return undefined;
    }
    
    const historyDir = path.join(workspaceFolder.uri.fsPath, '.gemini-history');
    
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
            // Try to copy terminal selection
            await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
            
            // Wait for copy to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get the copied terminal text
            const terminalText = await vscode.env.clipboard.readText();
            
            // Check if we got new text from terminal
            if (terminalText && terminalText !== originalClipboard) {
                textToSave = terminalText;
            }
        } catch {
            // If copy selection fails, fall back to clipboard
            console.log('Terminal copy selection failed, using clipboard content');
        }
    }
    
    // If no terminal text, try editor selection
    if (!textToSave) {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.selection && !editor.selection.isEmpty) {
            textToSave = editor.document.getText(editor.selection);
        }
    }
    
    // Finally, fall back to original clipboard if nothing else
    if (!textToSave) {
        textToSave = originalClipboard;
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
    
    // Format content with timestamp
    const timestamp = new Date().toTimeString().split(' ')[0];
    const header = `\n## [${timestamp}]\n`;
    const content = textToSave.trim();
    const formattedContent = `${header}${content}\n`;
    
    // Create file with header if it doesn't exist
    if (!fs.existsSync(historyPath)) {
        const dateStr = new Date().toISOString().split('T')[0];
        const fileHeader = `# Gemini CLI History - ${dateStr}\n`;
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

async function sendSelectedToGemini() {
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
    
    // Find active Gemini CLI terminal
    let geminiTerminal: vscode.Terminal | undefined;
    
    for (const terminal of geminiTerminals.values()) {
        if (vscode.window.terminals.includes(terminal)) {
            geminiTerminal = terminal;
            break;
        }
    }
    
    if (!geminiTerminal) {
        vscode.window.showWarningMessage('Gemini CLI is not running. Please start it first.');
        return;
    }
    
    // Show terminal and send text
    geminiTerminal.show();
    
    // Add a small delay to ensure terminal is focused
    setTimeout(() => {
        geminiTerminal!.sendText(selectedText! + ' ', false); // Add trailing space
    }, 100);
    
    vscode.window.showInformationMessage('Sent selected text to Gemini CLI');
}

function createOrFocusTerminal(context: vscode.ExtensionContext, location: vscode.TerminalOptions['location']) {
    const key = (location as any)?.viewColumn === vscode.ViewColumn.Beside ? 'newPane' : 'activePane';
    
    // Check if terminal exists and is still active
    const existingTerminal = geminiTerminals.get(key);
    if (existingTerminal) {
        // Check if terminal is still alive
        const allTerminals = vscode.window.terminals;
        if (allTerminals.includes(existingTerminal)) {
            existingTerminal.show();
            return;
        } else {
            // Terminal was closed, remove from map
            geminiTerminals.delete(key);
        }
    }
    
    // Create new terminal
    const iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png');
    const terminal = vscode.window.createTerminal({
        name: `Gemini CLI`,
        location: location,
        iconPath: iconPath
    });
    
    // Store the new terminal
    geminiTerminals.set(key, terminal);
    
    // Navigate to workspace folder if available
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const workspacePath = workspaceFolder.uri.fsPath;
        // Use quotes to handle paths with spaces
        terminal.sendText(`cd "${workspacePath}"`);
    }
    
    // Launch Gemini CLI
    terminal.sendText("gemini");
    terminal.show();
}

function sendOpenFilesToGemini() {
    // Find existing Gemini CLI terminal
    let activeTerminal: vscode.Terminal | undefined;
    
    for (const terminal of geminiTerminals.values()) {
        if (vscode.window.terminals.includes(terminal)) {
            activeTerminal = terminal;
            break;
        }
    }
    
    if (!activeTerminal) {
        vscode.window.showWarningMessage('Gemini CLI is not running. Please start it first.');
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
        return;
    }
    
    const filesText = `@${openFiles.join(' @')} `; // Add trailing space
    
    // Send to terminal
    activeTerminal.show();
    
    // Small delay to ensure terminal is focused and ready
    setTimeout(() => {
        activeTerminal!.sendText(filesText, false);
    }, 100);
    
    vscode.window.showInformationMessage(`Sent ${openFiles.length} file(s) to Gemini CLI`);
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
    // Show status bar only when Gemini CLI terminal is active
    const activeTerminal = vscode.window.activeTerminal;
    const activeEditor = vscode.window.activeTextEditor;
    
    // Hide if editor is active (not terminal)
    if (activeEditor) {
        saveHistoryStatusBarItem.hide();
        return;
    }
    
    // Check if the active terminal is a Gemini CLI terminal
    let isGeminiTerminal = false;
    if (activeTerminal) {
        for (const terminal of geminiTerminals.values()) {
            if (terminal === activeTerminal) {
                isGeminiTerminal = true;
                break;
            }
        }
    }
    
    if (isGeminiTerminal) {
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
    
    // Create status bar items
    createStatusBarItems(context);
    
    // Create FileHandler instance
    const fileHandler = new FileHandler(geminiTerminals);
    
    const startInNewPane = vscode.commands.registerCommand('gemini-cli-vscode.startInNewPane', () => {
        createOrFocusTerminal(context, { viewColumn: vscode.ViewColumn.Beside });
        updateStatusBarVisibility();
    });
    
    const startInActivePane = vscode.commands.registerCommand('gemini-cli-vscode.startInActivePane', () => {
        createOrFocusTerminal(context, { viewColumn: vscode.ViewColumn.Active });
        updateStatusBarVisibility();
    });
    
    const sendOpenFilePath = vscode.commands.registerCommand('gemini-cli-vscode.sendOpenFilePath', () => {
        sendOpenFilesToGemini();
    });
    
    const saveClipboard = vscode.commands.registerCommand('gemini-cli-vscode.saveClipboardToHistory', async () => {
        await saveClipboardToHistory();
    });
    
    const sendSelectedText = vscode.commands.registerCommand('gemini-cli-vscode.sendSelectedText', async () => {
        await sendSelectedToGemini();
    });
    
    const sendFilePath = vscode.commands.registerCommand('gemini-cli-vscode.sendFilePath', async (uri: vscode.Uri, uris?: vscode.Uri[]) => {
        console.log('sendFilePath called with uri:', uri?.fsPath, 'uris:', uris ? uris.map(u => u.fsPath) : 'none');
        
        // Handle multiple selection from explorer
        if (uris && uris.length > 0) {
            await fileHandler.sendFilesToTerminal(uris);
        } 
        // Handle single selection or editor tab context
        else if (uri) {
            await fileHandler.sendFilesToTerminal(uri);
        }
        // Handle command palette or other invocations
        else {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await fileHandler.sendFilesToTerminal(activeEditor.document.uri);
            } else {
                vscode.window.showWarningMessage('No file selected');
            }
        }
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
        updateStatusBarVisibility();
    });
    
    // Initial visibility update
    updateStatusBarVisibility();
    
    context.subscriptions.push(
        startInNewPane, 
        startInActivePane, 
        sendOpenFilePath,
        saveClipboard,
        sendSelectedText,
        sendFilePath
    );
}

export function deactivate() {
    // Clear terminals map on deactivation
    geminiTerminals.clear();
    isActivated = false;
}