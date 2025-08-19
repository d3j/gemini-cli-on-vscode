import * as vscode from 'vscode';

export class FileHandler {
    private geminiTerminals: Map<string, vscode.Terminal>;
    private codexTerminals: Map<string, vscode.Terminal>;
    private claudeTerminals: Map<string, vscode.Terminal>;
    private qwenTerminals: Map<string, vscode.Terminal>;

    constructor(
        geminiTerminals: Map<string, vscode.Terminal>, 
        codexTerminals: Map<string, vscode.Terminal>,
        claudeTerminals: Map<string, vscode.Terminal>,
        qwenTerminals: Map<string, vscode.Terminal>
    ) {
        this.geminiTerminals = geminiTerminals;
        this.codexTerminals = codexTerminals;
        this.claudeTerminals = claudeTerminals;
        this.qwenTerminals = qwenTerminals;
    }

    formatFilePath(uri: vscode.Uri): string {
        const path = vscode.workspace.asRelativePath(uri);
        const needsQuotes = path.includes(' ') || /[^\u0020-\u007E]/.test(path);
        return needsQuotes ? `@"${path}"` : `@${path}`;
    }

    prepareMultipleFilesMessage(filePaths: string[]): string {
        const formattedPaths = filePaths.map(filePath => {
            const uri = vscode.Uri.file(filePath);
            return this.formatFilePath(uri);
        });
        
        const fileList = formattedPaths.join(' ');
        return `These files are currently open: ${fileList}`;
    }

    findCLITerminal(_terminals: readonly vscode.Terminal[], targetCLI?: 'gemini' | 'codex' | 'claude' | 'qwen'): vscode.Terminal | undefined {
        const terminalMaps = {
            'claude': this.claudeTerminals,
            'codex': this.codexTerminals,
            'gemini': this.geminiTerminals,
            'qwen': this.qwenTerminals
        };
        
        if (targetCLI) {
            return this.findInMap(terminalMaps[targetCLI]);
        }
        
        // Priority: Claude -> Codex -> Gemini
        for (const cli of ['claude', 'codex', 'gemini'] as const) {
            const terminal = this.findInMap(terminalMaps[cli]);
            if (terminal) return terminal;
        }
        
        return undefined;
    }
    
    private findInMap(
        map: Map<string, vscode.Terminal>
    ): vscode.Terminal | undefined {
        for (const terminal of map.values()) {
            // Check if terminal exists and is not disposed
            if (terminal && !terminal.exitStatus) {
                return terminal;
            }
        }
        return undefined;
    }

    async broadcastToMultipleClis(
        prompt: string, 
        agents: ('gemini' | 'codex' | 'claude' | 'qwen')[], 
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
        const config = vscode.workspace.getConfiguration('gemini-cli-vscode.magusCouncil.composer.delays');
        const delays = {
            initial: config.get<number>('initial', 100),
            claude: {
                enter: config.get<number>('claude.enter', 150)
            },
            gemini: {
                enter: config.get<number>('gemini.enter', 600)
            }
        };

        // Find available terminals for each agent
        const availableAgents: { cli: 'gemini' | 'codex' | 'claude' | 'qwen', terminal: vscode.Terminal }[] = [];
        const missingAgents: string[] = [];

        for (const agent of agents) {
            const terminal = this.findCLITerminal(vscode.window.terminals, agent);
            if (terminal) {
                availableAgents.push({ cli: agent, terminal });
            } else {
                const cliNames = {
                    'claude': 'Claude',
                    'codex': 'Codex', 
                    'gemini': 'Gemini',
                    'qwen': 'Qwen'
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
            
            // Send prompt with clipboard paste method (reliable for multiline text)
            await new Promise<void>(resolve => {
                setTimeout(async () => {
                    // Copy prompt to clipboard
                    await vscode.env.clipboard.writeText(prompt);
                    
                    // Use VS Code's paste command for terminal
                    // This preserves newlines and works consistently across all CLIs
                    await vscode.commands.executeCommand('workbench.action.terminal.paste');
                    
                    // Send Enter to execute the command after paste
                    // Each CLI may need different timing
                    switch (cli) {
                        case 'claude': {
                            // Claude Code: Send Enter after delay
                            // 長文貼り付け時は[Pasted text]表示になるため、より長い待機が必要
                            // プロンプトの長さに応じて動的に調整
                            let claudeDelay = delays.claude.enter;
                            if (prompt.length > 2000) {
                                claudeDelay = 2500; // 2.5秒待機（5秒から半分に削減）
                            } else if (prompt.length > 1000) {
                                claudeDelay = 1500; // 1.5秒待機（3秒から半分に削減）
                            }
                            
                            setTimeout(() => {
                                terminal.sendText('', true);
                                resolve();
                            }, claudeDelay);
                            break;
                        }
                        
                        case 'gemini': {
                            // Gemini CLI: Send Enter after delay
                            setTimeout(() => {
                                terminal.sendText('', true);
                                resolve();
                            }, delays.gemini.enter);
                            break;
                        }
                        
                        case 'codex':
                        default: {
                            // Codex and others: Send Enter immediately
                            setTimeout(() => {
                                terminal.sendText('', true);
                                resolve();
                            }, 100);
                            break;
                        }
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

    async sendFilesToTerminal(uris: vscode.Uri[] | vscode.Uri, targetCLI?: 'gemini' | 'codex' | 'claude' | 'qwen'): Promise<void> {
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
                'gemini': 'Gemini',
                'qwen': 'Qwen'
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
