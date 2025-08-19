import * as vscode from 'vscode';
import { FileHandler } from '../fileHandler';
import { ConfigService } from './ConfigService';
import { TerminalManager } from './TerminalManager';
import { Logger } from './Logger';
import { HistoryService } from './HistoryService';
import { CLIType } from '../types';

export class CommandHandler implements vscode.Disposable {
    constructor(
        _context: vscode.ExtensionContext,
        private configService: ConfigService,
        private terminalManager: TerminalManager,
        private logger: Logger,
        private fileHandler: FileHandler,
        private historyService: HistoryService
    ) {
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
     * Dispose of resources
     */
    public dispose(): void {
        // Currently no resources to dispose
        // This method is here for future extensibility
    }

}