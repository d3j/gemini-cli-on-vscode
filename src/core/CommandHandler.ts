import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileHandler } from '../fileHandler';
import { ConfigService } from './ConfigService';
import { TerminalManager } from './TerminalManager';
import { Logger } from './Logger';
import { CLIType } from '../types';

export class CommandHandler {
    private saveHistoryStatusBarItem: vscode.StatusBarItem | undefined;

    constructor(
        private context: vscode.ExtensionContext,
        private configService: ConfigService,
        private terminalManager: TerminalManager,
        private logger: Logger,
        private fileHandler: FileHandler
    ) {}

    public createStatusBarItems(): void {
        // Create status bar item for save history
        this.saveHistoryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.saveHistoryStatusBarItem.command = 'gemini-cli-vscode.saveToHistory';
        this.saveHistoryStatusBarItem.text = '$(save) Save to History';
        this.saveHistoryStatusBarItem.tooltip = 'Save current clipboard to history';
        this.context.subscriptions.push(this.saveHistoryStatusBarItem);
        
        this.updateStatusBarVisibility();
    }

    public updateStatusBarVisibility(): void {
        const showInStatusBar = this.configService.get<boolean>('saveToHistory.showInStatusBar', true);
        if (this.saveHistoryStatusBarItem) {
            if (showInStatusBar) {
                this.saveHistoryStatusBarItem.show();
            } else {
                this.saveHistoryStatusBarItem.hide();
            }
        }
    }

    public async saveClipboardToHistory(): Promise<void> {
        // Check if saveToHistory is enabled
        const saveToHistoryEnabled = this.configService.get<boolean>('saveToHistory.enabled', true);
        
        if (!saveToHistoryEnabled) {
            vscode.window.showInformationMessage('Save to History is disabled. Enable it in settings to use this feature.');
            return;
        }
        
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
                this.logger.error('Terminal copy selection failed');
            }
        }
        
        // If no terminal selection, try editor
        if (!textToSave) {
            const editor = vscode.window.activeTextEditor;
            if (editor && !editor.selection.isEmpty) {
                textToSave = editor.document.getText(editor.selection);
            }
        }
        
        // If still no text, use existing clipboard content
        if (!textToSave) {
            // Restore original clipboard content before reading
            await vscode.env.clipboard.writeText(originalClipboard);
            textToSave = originalClipboard;
        } else {
            // Restore original clipboard content
            await vscode.env.clipboard.writeText(originalClipboard);
        }
        
        if (!textToSave || textToSave.trim().length === 0) {
            vscode.window.showWarningMessage('No text to save. Select text in editor or copy to clipboard first.');
            return;
        }
        
        const historyPath = this.getHistoryFilePath();
        if (!historyPath) {
            vscode.window.showErrorMessage('No workspace folder found. Open a folder to save history.');
            return;
        }
        
        try {
            // Prepare content with timestamp and terminal info
            const timestamp = new Date().toISOString();
            
            // Include terminal name if configured and from terminal
            const includeTerminalName = this.configService.get<boolean>('saveToHistory.includeTerminalName', false);
            let header = `\n## ${timestamp}`;
            
            if (includeTerminalName && activeTerminal) {
                header += ` - Terminal: ${activeTerminal.name}`;
            }
            
            const content = `${header}\n\n\`\`\`\n${textToSave}\n\`\`\`\n`;
            
            // Append to history file
            if (fs.existsSync(historyPath)) {
                fs.appendFileSync(historyPath, content, 'utf8');
            } else {
                // Create new file with header
                const dateStr = new Date().toISOString().split('T')[0];
                const fileHeader = `# History - ${dateStr}\n\n`;
                fs.writeFileSync(historyPath, fileHeader + content, 'utf8');
            }
            
            vscode.window.showInformationMessage(`Saved to history: ${path.basename(historyPath)}`);
        } catch (error) {
            this.logger.error('Failed to save to history', error);
            vscode.window.showErrorMessage(`Failed to save to history: ${error}`);
        }
    }

    public async sendSelectedToCLI(targetCLI?: CLIType): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        
        if (!targetCLI) {
            // Show picker if no CLI specified
            const items = [
                { label: 'Gemini CLI', value: 'gemini' as CLIType },
                { label: 'Codex CLI', value: 'codex' as CLIType },
                { label: 'Claude Code', value: 'claude' as CLIType },
                { label: 'Qwen CLI', value: 'qwen' as CLIType }
            ];
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select CLI to send to'
            });
            
            if (!selected) {
                return;
            }
            targetCLI = selected.value;
        }
        
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }
        
        const selection = editor.selection;
        let text: string;
        
        if (selection && !selection.isEmpty) {
            text = editor.document.getText(selection);
        } else {
            text = editor.document.getText();
        }
        
        if (!text) {
            vscode.window.showWarningMessage('No text selected or document is empty');
            return;
        }
        
        const viewColumn = this.getViewColumnForEditorButton();
        
        // Create or focus terminal for the selected CLI
        const terminal = await this.terminalManager.createOrFocusTerminal(
            targetCLI,
            {
                preserveFocus: false,
                location: viewColumn
            }
        );
        
        if (!terminal) {
            vscode.window.showErrorMessage(`Failed to create ${targetCLI} terminal`);
            return;
        }
        
        // Show terminal
        terminal.show(false);
        
        // Send text with appropriate delay
        await this.terminalManager.sendTextToTerminal(terminal, text, targetCLI);
    }

    public async sendOpenFilesToCLI(targetCLI?: CLIType): Promise<void> {
        if (!targetCLI) {
            // Show picker if no CLI specified
            const items = [
                { label: 'Gemini CLI', value: 'gemini' as CLIType },
                { label: 'Codex CLI', value: 'codex' as CLIType },
                { label: 'Claude Code', value: 'claude' as CLIType },
                { label: 'Qwen CLI', value: 'qwen' as CLIType }
            ];
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select CLI to send to'
            });
            
            if (!selected) {
                return;
            }
            targetCLI = selected.value;
        }
        
        // Get all open files
        const openFiles = vscode.workspace.textDocuments
            .filter(doc => !doc.isUntitled && doc.uri.scheme === 'file')
            .map(doc => doc.uri.fsPath);
        
        if (openFiles.length === 0) {
            vscode.window.showWarningMessage('No files are currently open');
            return;
        }
        
        // Use FileHandler to prepare message
        const message = this.fileHandler.prepareMultipleFilesMessage(openFiles);
        
        const viewColumn = this.getViewColumnForEditorButton();
        
        // Create or focus terminal for the selected CLI
        const terminal = await this.terminalManager.createOrFocusTerminal(
            targetCLI,
            {
                preserveFocus: false,
                location: viewColumn
            }
        );
        
        if (!terminal) {
            vscode.window.showErrorMessage(`Failed to create ${targetCLI} terminal`);
            return;
        }
        
        // Show terminal
        terminal.show(false);
        
        // Send message with appropriate delay
        await this.terminalManager.sendTextToTerminal(terminal, message, targetCLI);
        
        vscode.window.showInformationMessage(`Sent ${openFiles.length} open file(s) to ${targetCLI}`);
    }

    public async launchAllCLIs(): Promise<void> {
        const cliTypes: CLIType[] = ['gemini', 'codex', 'claude', 'qwen'];
        
        for (const cliType of cliTypes) {
            const enabled = this.configService.get<boolean>(`clis.${cliType}.enabled`, true);
            if (enabled) {
                const terminal = await this.terminalManager.createOrFocusTerminal(
                    cliType,
                    {
                        preserveFocus: true,
                        location: { viewColumn: vscode.ViewColumn.Active }
                    }
                );
                
                if (terminal) {
                    this.logger.info(`Launched ${cliType} CLI`);
                }
            }
        }
        
        vscode.window.showInformationMessage('All enabled CLIs have been launched');
    }

    private getHistoryFilePath(): string | undefined {
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

    private getViewColumnForEditorButton(): vscode.ViewColumn {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const currentColumn = activeEditor.viewColumn || vscode.ViewColumn.One;
            // Return the column next to the current editor
            return currentColumn === vscode.ViewColumn.One ? vscode.ViewColumn.Two : currentColumn;
        }
        return vscode.ViewColumn.Two;
    }
}