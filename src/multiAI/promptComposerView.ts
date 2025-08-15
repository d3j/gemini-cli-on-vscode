import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileHandler } from '../fileHandler';
import { ContextManager } from './contextManager';

export class PromptComposerViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'gemini-cli-vscode.promptComposerView';

    private view: vscode.WebviewView | undefined;
    private contextManager: ContextManager;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly fileHandler: FileHandler
    ) {
        this.contextManager = new ContextManager();
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'resources'),
                vscode.Uri.joinPath(this.context.extensionUri, 'images')
            ]
        };

        // VS Code側にパネルタイトルを表示（コンテナ名と統一）
        webviewView.title = 'MAGUS Council';

        webviewView.webview.html = this.getWebviewContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'composer/init':
                    await this.handleInit();
                    break;
                case 'composer/askAll':
                    await this.handleAskAll(message.payload);
                    break;
                case 'composer/addContext':
                    await this.handleAddContext(message.payload);
                    break;
                case 'composer/preview':
                    await this.handlePreview(message.payload);
                    break;
            }
        });
    }

    private async handleInit(): Promise<void> {
        const config = vscode.workspace.getConfiguration('gemini-cli-vscode.multiAI');
        const defaultAgents = config.get<string[]>('defaultAgents', ['gemini', 'codex', 'claude']);

        this.view?.webview.postMessage({
            type: 'composer/state',
            payload: {
                defaultAgents,
                recentPrompts: []
            }
        });
    }

    private async handleAskAll(payload: { prompt: string; agents: string[]; includeContext: boolean; }): Promise<void> {
        let finalPrompt = payload.prompt;

        if (payload.includeContext) {
            const context = await this.contextManager.buildContext();
            if (context) {
                finalPrompt = `${payload.prompt}\n\n${context}`;
            }
        }

        if (!finalPrompt || finalPrompt.trim().length === 0) {
            this.view?.webview.postMessage({
                type: 'composer/error',
                payload: { message: 'Please enter a prompt' }
            });
            return;
        }

        if (!payload.agents || payload.agents.length === 0) {
            this.view?.webview.postMessage({
                type: 'composer/error',
                payload: { message: 'Please select at least one AI agent' }
            });
            return;
        }

        const config = vscode.workspace.getConfiguration('gemini-cli-vscode.multiAI');
        const autoSaveHistory = config.get<boolean>('composer.autoSaveHistory', true);
        if (autoSaveHistory) {
            await this.savePromptToHistory(finalPrompt, payload.agents);
        }

        await this.fileHandler.broadcastToMultipleClis(
            finalPrompt,
            payload.agents as ('gemini' | 'codex' | 'claude' | 'qwen')[]
        );

        // Notification is handled by fileHandler.broadcastToMultipleClis
    }

    private async savePromptToHistory(prompt: string, agents: string[]): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        const historyDir = path.join(workspaceFolder.uri.fsPath, '.history-memo');
        if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const historyPath = path.join(historyDir, `${dateStr}.md`);
        const timestamp = new Date().toTimeString().split(' ')[0];
        const agentList = agents.join(', ');
        const header = `\n## [${timestamp}] - MAGUS Council → ${agentList}\n`;
        const content = prompt.trim();
        const formattedContent = `${header}${content}\n`;

        if (!fs.existsSync(historyPath)) {
            const fileHeader = `# History Memo - ${dateStr}\n`;
            fs.writeFileSync(historyPath, fileHeader);
        }
        fs.appendFileSync(historyPath, formattedContent);
    }

    private async handleAddContext(payload: { type: 'explorer'; path?: string; }): Promise<void> {
        let contextInfo: any = {};
        switch (payload.type) {
            case 'explorer': {
                if (payload.path) {
                    contextInfo = { type: 'explorer', path: payload.path, name: path.basename(payload.path) };
                }
                break;
            }
        }
        this.view?.webview.postMessage({ type: 'composer/contextAdded', payload: contextInfo });
    }

    private async handlePreview(payload: { prompt: string; includeContext: boolean; }): Promise<void> {
        let preview = payload.prompt;
        if (payload.includeContext) {
            const context = await this.contextManager.buildContext();
            if (context) preview = `${payload.prompt}\n\n${context}`;
        }
        const estimatedTokens = Math.ceil((preview || '').length / 4);
        this.view?.webview.postMessage({
            type: 'composer/previewUpdate',
            payload: { preview, estimatedTokens, characterCount: (preview || '').length }
        });
    }

    private getWebviewContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'promptComposer.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'promptComposer.css')
        );
        const geminiIconUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'images', 'icon.png')
        );
        const claudeIconUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'images', 'claude-logo.png')
        );
        const codexIconUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'images', 'codex-icon.png')
        );
        const qwenIconUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'images', 'qwen-color.svg')
        );
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <link href="${styleUri}" rel="stylesheet">
            <title>MAGUS Council</title>
        </head>
        <body>
            <div class="composer-container">
                <div class="prompt-section">
                    <label for="prompt-input">Prompt</label>
                    <textarea id="prompt-input" placeholder="Type your question or prompt here..." rows="8"></textarea>
                    <button id="ask-all" class="primary-btn" title="Send to all selected AIs (Ctrl+Enter)">🔮 Ask All</button>
                    <div class="shortcut-hint">Press Ctrl+Enter (Cmd+Enter on Mac) to send</div>
                </div>

                <div class="agents-section">
                    <label>Target AIs</label>
                    <div class="agent-toggles">
                        <button class="ai-toggle active" data-agent="gemini" title="Gemini AI">
                            <img src="${geminiIconUri}" class="ai-icon" alt="Gemini">
                        </button>
                        <button class="ai-toggle active" data-agent="codex" title="Codex AI">
                            <img src="${codexIconUri}" class="ai-icon" alt="Codex">
                        </button>
                        <button class="ai-toggle active" data-agent="claude" title="Claude AI">
                            <img src="${claudeIconUri}" class="ai-icon" alt="Claude">
                        </button>
                        <button class="ai-toggle" data-agent="qwen" title="Qwen AI">
                            <img src="${qwenIconUri}" class="ai-icon" alt="Qwen">
                        </button>
                    </div>
                </div>

                <div class="context-section">
                    <label>Context</label>
                    <div class="context-status">
                        <button id="include-context-btn" class="context-toggle-btn active" title="Includes all open file paths in the editor">
                            📝 Include Context
                        </button>
                    </div>
                </div>

                <div class="preview-section">
                    <details>
                        <summary>Preview</summary>
                        <div id="preview-content" class="preview-content"><em>Your prompt will appear here...</em></div>
                    </details>
                </div>

                <div class="stats-section">
                    <div class="stats">
                        <span>💬 Characters: <span id="char-count">0</span></span>
                        <span>📊 Est. Tokens: <span id="token-count">0</span></span>
                    </div>
                </div>
            </div>

            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private getNonce(): string {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
