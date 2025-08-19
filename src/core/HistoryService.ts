import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from './ConfigService';
import { Logger } from './Logger';

/**
 * Service for managing conversation history
 */
export class HistoryService implements vscode.Disposable {
    constructor(
        private readonly configService: ConfigService,
        private readonly logger: Logger
    ) {}

    /**
     * Save clipboard content to history file
     */
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

    /**
     * Get history file path for current workspace
     */
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

    /**
     * Save text from webview to history
     */
    public async saveTextFromWebview(text: string): Promise<void> {
        const historyPath = this.getHistoryFilePath();
        if (!historyPath) {
            this.logger.error('No workspace folder for history');
            return;
        }

        try {
            const timestamp = new Date().toISOString();
            const header = `\n## ${timestamp} - MAGUS Council Composer`;
            const content = `${header}\n\n\`\`\`\n${text}\n\`\`\`\n`;
            
            if (fs.existsSync(historyPath)) {
                fs.appendFileSync(historyPath, content, 'utf8');
            } else {
                const dateStr = new Date().toISOString().split('T')[0];
                const fileHeader = `# History - ${dateStr}\n\n`;
                fs.writeFileSync(historyPath, fileHeader + content, 'utf8');
            }
            
            this.logger.info('Saved webview text to history');
        } catch (error) {
            this.logger.error('Failed to save webview text to history', error);
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // No resources to dispose currently
        this.logger.info('HistoryService disposed');
    }
}