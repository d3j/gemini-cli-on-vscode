import * as vscode from 'vscode';

export class FileHandler {
    private geminiTerminals: Map<string, vscode.Terminal>;
    private codexTerminals: Map<string, vscode.Terminal>;

    constructor(geminiTerminals: Map<string, vscode.Terminal>, codexTerminals: Map<string, vscode.Terminal>) {
        this.geminiTerminals = geminiTerminals;
        this.codexTerminals = codexTerminals;
    }

    formatFilePath(uri: vscode.Uri): string {
        const path = vscode.workspace.asRelativePath(uri);
        const needsQuotes = path.includes(' ') || /[^\u0020-\u007E]/.test(path);
        return needsQuotes ? `@"${path}"` : `@${path}`;
    }

    findCLITerminal(terminals: readonly vscode.Terminal[], targetCLI?: 'gemini' | 'codex'): vscode.Terminal | undefined {
        if (targetCLI === 'codex') {
            for (const terminal of this.codexTerminals.values()) {
                if (terminals.includes(terminal)) {
                    return terminal;
                }
            }
        } else if (targetCLI === 'gemini') {
            for (const terminal of this.geminiTerminals.values()) {
                if (terminals.includes(terminal)) {
                    return terminal;
                }
            }
        } else {
            // Check both if no specific target
            for (const terminal of this.codexTerminals.values()) {
                if (terminals.includes(terminal)) {
                    return terminal;
                }
            }
            for (const terminal of this.geminiTerminals.values()) {
                if (terminals.includes(terminal)) {
                    return terminal;
                }
            }
        }
        return undefined;
    }

    async sendFilesToTerminal(uris: vscode.Uri[] | vscode.Uri, targetCLI?: 'gemini' | 'codex'): Promise<void> {
        // Handle single URI or array
        const uriArray = Array.isArray(uris) ? uris : [uris];
        
        // Debug log
        console.log('sendFilesToTerminal called with:', uriArray.map(u => u.fsPath), 'target:', targetCLI);
        
        if (!uriArray || uriArray.length === 0) {
            vscode.window.showWarningMessage('No item selected');
            return;
        }

        const terminal = this.findCLITerminal(vscode.window.terminals, targetCLI);
        if (!terminal) {
            const message = targetCLI 
                ? `${targetCLI === 'codex' ? 'Codex' : 'Gemini'} CLI is not running. Please start it first.`
                : 'No AI CLI is running. Please start Gemini or Codex CLI first.';
            vscode.window.showWarningMessage(message);
            return;
        }

        // Send all paths (files and folders)
        const paths = uriArray.map(uri => this.formatFilePath(uri));
        const message = paths.join(' ') + ' '; // Add trailing space
        
        console.log('Sending to terminal:', message);
        
        terminal.show();
        
        // Add a small delay to ensure terminal is ready
        // Use sendText with false to avoid sending Enter
        setTimeout(() => {
            terminal.sendText(message, false);
        }, 100);
        
        const itemCount = uriArray.length;
        const cliName = terminal.name; // Terminal name will be "Gemini CLI" or "Codex CLI"
        vscode.window.showInformationMessage(
            `Sent ${itemCount} item${itemCount > 1 ? 's' : ''} to ${cliName}`
        );
    }
}