import * as vscode from 'vscode';
import { FileHandler } from '../fileHandler';
import { ConfigService } from './ConfigService';
import { TerminalManager } from './TerminalManager';
import { Logger } from './Logger';
import { HistoryService } from './HistoryService';
import { CLIType } from '../types';
import { PromptComposerViewProvider } from '../multiAI/promptComposerView';

export class CommandHandler implements vscode.Disposable {
    private promptComposerViewProvider?: PromptComposerViewProvider;
    
    constructor(
        _context: vscode.ExtensionContext,
        private configService: ConfigService,
        private terminalManager: TerminalManager,
        private logger: Logger,
        private fileHandler: FileHandler,
        private historyService: HistoryService
    ) {
    }
    
    /**
     * Set the PromptComposerViewProvider for MAGUS Council integration
     */
    public setPromptComposerViewProvider(provider?: PromptComposerViewProvider): void {
        this.promptComposerViewProvider = provider;
    }

    public async saveClipboardToHistory(): Promise<void> {
        await this.historyService.saveClipboardToHistory();
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
        
        // Create or focus terminal for the selected CLI
        const terminal = await this.terminalManager.createOrFocusTerminal(
            targetCLI,
            {
                preserveFocus: false
            }
        );
        
        if (!terminal) {
            vscode.window.showErrorMessage(`Failed to create ${targetCLI} terminal`);
            return;
        }
        
        // Show terminal
        terminal.show(false);
        
        // Send text without Enter (keep input for user to modify)
        await this.terminalManager.sendTextToTerminal(terminal, text, targetCLI, false);
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
        
        // Create or focus terminal for the selected CLI
        const terminal = await this.terminalManager.createOrFocusTerminal(
            targetCLI,
            {
                preserveFocus: false
            }
        );
        
        if (!terminal) {
            vscode.window.showErrorMessage(`Failed to create ${targetCLI} terminal`);
            return;
        }
        
        // Show terminal
        terminal.show(false);
        
        // Send message without Enter (keep input for user to modify)
        await this.terminalManager.sendTextToTerminal(terminal, message, targetCLI, false);
        
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
                        forceNew: false  // Reuse existing terminal if available
                    }
                );
                
                if (terminal) {
                    this.logger.info(`Launched ${cliType} CLI`);
                }
            }
        }
        
        vscode.window.showInformationMessage('All enabled CLIs have been launched');
    }

    /**
     * Send selected text to MAGUS Council Composer
     */
    public async sendSelectedToMAGUSCouncil(): Promise<void> {
        // 1. Get selected text from active editor
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }
        
        const selection = editor.selection;
        let text: string;
        
        if (selection && !selection.isEmpty) {
            text = editor.document.getText(selection);
        } else {
            // Send entire document if no selection
            text = editor.document.getText();
        }
        
        if (!text) {
            vscode.window.showWarningMessage('No text selected or document is empty');
            return;
        }
        
        // 2. Check text size (100KB limit warning)
        const textSizeKB = Buffer.byteLength(text, 'utf8') / 1024;
        if (textSizeKB > 100) {
            const choice = await vscode.window.showWarningMessage(
                `Selected text is ${Math.round(textSizeKB)}KB. This may affect performance.`,
                'Continue', 'Cancel'
            );
            if (choice !== 'Continue') {
                return;
            }
        }
        
        // 3. Open/focus MAGUS Council WebView
        try {
            await vscode.commands.executeCommand('gemini-cli-vscode.multiAI.openComposer');
        } catch (error) {
            this.logger.error('Failed to open MAGUS Council', error);
            vscode.window.showErrorMessage('Failed to open MAGUS Council');
            return;
        }
        
        // 4. Send text to WebView (with ready wait and retry)
        if (this.promptComposerViewProvider) {
            await this.promptComposerViewProvider.setPromptText(text);
        } else {
            // Fallback: copy to clipboard
            await vscode.env.clipboard.writeText(text);
            vscode.window.showInformationMessage(
                'MAGUS Council is initializing. Text copied to clipboard - please paste it into the composer.'
            );
        }
    }

    /**
     * Send file path to MAGUS Council
     */
    public async sendFilePathToMAGUSCouncil(uri: vscode.Uri | undefined, uris: vscode.Uri[] | undefined): Promise<void> {
        // Format file paths
        let filePathText = '';
        
        if (uris && uris.length > 0) {
            // Multiple files selected
            const formattedPaths = uris.map(u => this.fileHandler.formatFilePath(u));
            filePathText = formattedPaths.join(' ');
        } else if (uri) {
            // Single file selected
            filePathText = this.fileHandler.formatFilePath(uri);
        } else {
            // Use active editor's file
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                filePathText = this.fileHandler.formatFilePath(activeEditor.document.uri);
            } else {
                vscode.window.showWarningMessage('No file selected');
                return;
            }
        }
        
        // Open/focus MAGUS Council WebView
        try {
            await vscode.commands.executeCommand('gemini-cli-vscode.multiAI.openComposer');
        } catch (error) {
            this.logger.error('Failed to open MAGUS Council', error);
            vscode.window.showErrorMessage('Failed to open MAGUS Council');
            return;
        }
        
        // Send file paths to WebView
        if (this.promptComposerViewProvider) {
            await this.promptComposerViewProvider.setPromptText(filePathText);
        } else {
            // Fallback: copy to clipboard
            await vscode.env.clipboard.writeText(filePathText);
            vscode.window.showInformationMessage(
                'MAGUS Council is initializing. File paths copied to clipboard - please paste them into the composer.'
            );
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Currently no resources to dispose
        // This method is here for future extensibility
    }

}