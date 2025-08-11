import * as vscode from 'vscode';

export class FileHandler {
    private geminiTerminals: Map<string, vscode.Terminal>;
    private codexTerminals: Map<string, vscode.Terminal>;
    private claudeTerminals: Map<string, vscode.Terminal>;

    constructor(
        geminiTerminals: Map<string, vscode.Terminal>, 
        codexTerminals: Map<string, vscode.Terminal>,
        claudeTerminals: Map<string, vscode.Terminal>
    ) {
        this.geminiTerminals = geminiTerminals;
        this.codexTerminals = codexTerminals;
        this.claudeTerminals = claudeTerminals;
    }

    formatFilePath(uri: vscode.Uri): string {
        const path = vscode.workspace.asRelativePath(uri);
        const needsQuotes = path.includes(' ') || /[^\u0020-\u007E]/.test(path);
        return needsQuotes ? `@"${path}"` : `@${path}`;
    }

    findCLITerminal(terminals: readonly vscode.Terminal[], targetCLI?: 'gemini' | 'codex' | 'claude'): vscode.Terminal | undefined {
        const terminalMaps = {
            'claude': this.claudeTerminals,
            'codex': this.codexTerminals,
            'gemini': this.geminiTerminals
        };
        
        if (targetCLI) {
            return this.findInMap(terminalMaps[targetCLI], terminals);
        }
        
        // Priority: Claude -> Codex -> Gemini
        for (const cli of ['claude', 'codex', 'gemini'] as const) {
            const terminal = this.findInMap(terminalMaps[cli], terminals);
            if (terminal) return terminal;
        }
        
        return undefined;
    }
    
    private findInMap(
        map: Map<string, vscode.Terminal>,
        terminals: readonly vscode.Terminal[]
    ): vscode.Terminal | undefined {
        for (const terminal of map.values()) {
            if (terminals.includes(terminal)) {
                return terminal;
            }
        }
        return undefined;
    }

    async sendFilesToTerminal(uris: vscode.Uri[] | vscode.Uri, targetCLI?: 'gemini' | 'codex' | 'claude'): Promise<void> {
        // Handle single URI or array
        const uriArray = Array.isArray(uris) ? uris : [uris];
        
        // Debug log - commented out for production
        // console.log('sendFilesToTerminal called with:', uriArray.map(u => u.fsPath), 'target:', targetCLI);
        
        if (!uriArray || uriArray.length === 0) {
            vscode.window.showWarningMessage('No item selected');
            return;
        }

        const terminal = this.findCLITerminal(vscode.window.terminals, targetCLI);
        if (!terminal) {
            const cliNames = {
                'claude': 'Claude Code',
                'codex': 'Codex',
                'gemini': 'Gemini'
            };
            const message = targetCLI 
                ? `${cliNames[targetCLI]} CLI is not running. Please start it first.`
                : 'No CLI is running. Please start Gemini, Codex, or Claude CLI first.';
            vscode.window.showWarningMessage(message);
            return;
        }

        // Send all paths (files and folders)
        const paths = uriArray.map(uri => this.formatFilePath(uri));
        const message = paths.join(' ') + ' '; // Add trailing space
        
        // Debug log - commented out for production
        // console.log('Sending to terminal:', message);
        
        terminal.show();
        
        // Add a small delay to ensure terminal is ready
        // Use sendText with false to avoid sending Enter
        setTimeout(() => {
            terminal.sendText(message, false);
        }, 100);
        
        const itemCount = uriArray.length;
        const cliName = terminal.name.replace(/\[.*?\]\s*/, ''); // Remove session ID if present
        vscode.window.showInformationMessage(
            `Sent ${itemCount} item${itemCount > 1 ? 's' : ''} to ${cliName}`
        );
    }
}