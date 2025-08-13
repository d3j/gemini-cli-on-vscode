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

    async broadcastToMultipleClis(
        prompt: string, 
        agents: ('gemini' | 'codex' | 'claude')[], 
        delayMs: number = 0
    ): Promise<void> {
        // Validate input
        if (!prompt || prompt.trim() === '') {
            vscode.window.showWarningMessage('Empty prompt. Please enter a prompt to send.');
            return;
        }

        if (!agents || agents.length === 0) {
            vscode.window.showWarningMessage('No agents selected. Please select at least one AI agent.');
            return;
        }

        // Get delay settings from configuration
        const config = vscode.workspace.getConfiguration('gemini-cli-vscode.multiAI.composer.delays');
        const delays = {
            initial: config.get<number>('initial', 100),
            claude: {
                enter: config.get<number>('claude.enter', 150)
            },
            gemini: {
                showWait: config.get<number>('gemini.showWait', 250),
                enter: config.get<number>('gemini.enter', 600)
            }
        };

        // Find available terminals for each agent
        const availableAgents: { cli: 'gemini' | 'codex' | 'claude', terminal: vscode.Terminal }[] = [];
        const missingAgents: string[] = [];

        for (const agent of agents) {
            const terminal = this.findCLITerminal(vscode.window.terminals, agent);
            if (terminal) {
                availableAgents.push({ cli: agent, terminal });
            } else {
                const cliNames = {
                    'claude': 'Claude',
                    'codex': 'Codex', 
                    'gemini': 'Gemini'
                };
                missingAgents.push(cliNames[agent]);
            }
        }

        // Warn about missing agents
        if (missingAgents.length > 0) {
            vscode.window.showWarningMessage(
                `The following CLIs are not running: ${missingAgents.join(', ')}. Please start them first.`
            );
        }

        // Send prompt to all available agents
        for (let i = 0; i < availableAgents.length; i++) {
            const { cli, terminal } = availableAgents[i];
            
            // Add delay between sends if specified (except for the first one)
            if (i > 0 && delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            terminal.show();
            
            // Send prompt with CLI-specific execution method
            await new Promise<void>(resolve => {
                setTimeout(async () => {
                    // Each CLI has different behavior with sendText
                    switch (cli) {
                        case 'codex':
                            // Codex works correctly with sendText(prompt, true)
                            terminal.sendText(prompt, true);
                            resolve();
                            break;
                        
                        case 'claude':
                            // Claude Code: send prompt without Enter, then send Enter separately
                            terminal.sendText(prompt, false);
                            // Send Enter after configurable delay
                            setTimeout(() => {
                                terminal.sendText('', true);
                                resolve();
                            }, delays.claude.enter);
                            break;
                        
                        case 'gemini':
                            // Gemini CLI: ensure terminal is active before sending
                            // First, show the terminal without preserving focus
                            terminal.show(false);
                            
                            // Wait for terminal to be fully active
                            setTimeout(() => {
                                // Send the prompt without Enter first
                                terminal.sendText(prompt, false);
                                
                                // Wait a bit then send Enter
                                setTimeout(() => {
                                    terminal.sendText('', true);
                                    resolve();
                                }, delays.gemini.enter);
                            }, delays.gemini.showWait);
                            break;
                        
                        default:
                            // Fallback to standard behavior
                            terminal.sendText(prompt, true);
                            resolve();
                            break;
                    }
                }, delays.initial);
            });
        }

        // Show success message
        if (availableAgents.length > 0) {
            vscode.window.showInformationMessage(
                `Prompt sent to ${availableAgents.length} AI agent${availableAgents.length > 1 ? 's' : ''}`
            );
        }
    }

    async sendFilesToTerminal(uris: vscode.Uri[] | vscode.Uri, targetCLI?: 'gemini' | 'codex' | 'claude'): Promise<void> {
        // Handle single URI or array
        const uriArray = Array.isArray(uris) ? uris : [uris];
        
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