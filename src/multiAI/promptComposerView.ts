import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileHandler } from '../fileHandler';
import { ContextManager } from './contextManager';
import { 
    WebviewToExtensionMessage, 
    ExtensionToWebviewMessage,
    isWebviewToExtensionMessage,
    TerminalInfo
} from '../types/ipc';
import { createNonce, getCspMeta, asWebviewUri, getLocalResourceRoots } from '../ui/webviewUtils';
import { TemplateService } from '../templates/templateService';

export class PromptComposerViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'gemini-cli-vscode.promptComposerView';

    private view: vscode.WebviewView | undefined;
    private contextManager: ContextManager;
    private isReady = false;
    private templateService: TemplateService;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly fileHandler: FileHandler
    ) {
        this.contextManager = new ContextManager();
        this.templateService = new TemplateService();
    }

    public postMessageToWebview(message: any): void {
        if (!this.view) return;
        this.view.webview.postMessage(message);
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: getLocalResourceRoots(this.context)
        };

        // VS Code側にパネルタイトルを表示（コンテナ名と統一）
        webviewView.title = 'MAGUS Council';

        webviewView.webview.html = this.getWebviewContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            // Handle legacy message format for backward compatibility
            if (message.type) {
                await this.handleLegacyMessage(message);
                return;
            }
            
            // Handle new IPC format
            if (isWebviewToExtensionMessage(message)) {
                await this.handleIPCMessage(message);
                return;
            }
            
            console.error('Unknown message format:', message);
        });
    }
    
    private async handleLegacyMessage(message: any): Promise<void> {
        switch (message.type) {
            case 'composer/init':
                await this.handleInit();
                break;
            case 'composer/ready':
                this.isReady = true;
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
    }
    
    private async handleIPCMessage(message: WebviewToExtensionMessage): Promise<void> {
        const { requestId } = message;
        
        try {
            switch (message.command) {
                case 'sendToTerminal':
                    // Send text to terminal
                    await this.sendToTerminal(message.text, message.terminal);
                    await this.sendResponse(requestId, { 
                        type: 'result', 
                        success: true
                    });
                    break;
                    
                case 'saveHistory':
                    // Save content to history
                    await this.saveToHistory(message.text);
                    await this.sendResponse(requestId, { 
                        type: 'result', 
                        success: true
                    });
                    break;
                    
                case 'clearPrompt':
                    // Clear prompt is handled in webview
                    await this.sendResponse(requestId, { 
                        type: 'result', 
                        success: true
                    });
                    break;
                    
                case 'updateTerminals':
                    // Update terminal list
                    await this.sendResponse(requestId, {
                        type: 'terminalsUpdate',
                        terminals: message.terminals
                    });
                    break;
                case 'templates/list': {
                    const { templates, total, hasMore } = await this.templateService.list(message.payload);
                    await this.sendResponse(requestId, { type: 'result', data: { templates, total, hasMore } });
                    break;
                }
                case 'templates/get': {
                    const t = await this.templateService.get(message.payload.id);
                    await this.sendResponse(requestId, { type: 'result', data: { template: t } });
                    break;
                }
                case 'templates/preview': {
                    const res = await this.templateService.preview(message.payload.id, message.payload.values);
                    await this.sendResponse(requestId, { type: 'result', data: res });
                    break;
                }
                case 'templates/render': {
                    const res = await this.templateService.render(message.payload.id, message.payload.values);
                    await this.sendResponse(requestId, { type: 'result', data: res });
                    break;
                }
                case 'history/list': {
                    // For now, use TemplateService.list with source history
                    const { templates } = await this.templateService.list({ sources: ['history'] });
                    await this.sendResponse(requestId, { type: 'result', data: { entries: templates } });
                    break;
                }
                
                default:
                    // exhaustiveness check
                    throw new Error(`Unknown command: ${(message as any).command}`);
            }
        } catch (error) {
            await this.sendResponse(requestId, {
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    
    private async sendResponse(
        requestId: string | undefined,
        payload: { type: 'stateUpdate'; terminals: TerminalInfo[] } |
                 { type: 'result'; success: boolean; error?: string } |
                 { type: 'error'; error: string; code?: string } |
                 { type: 'terminalsUpdate'; terminals: string[] } |
                 { type: 'result'; data: any }
    ): Promise<void> {
        if (!this.view) return;
        
        const response: ExtensionToWebviewMessage = {
            ...payload,
            requestId,
            version: 1
        } as ExtensionToWebviewMessage;
        
        await this.view.webview.postMessage(response);
    }

    private async handleInit(): Promise<void> {
        const config = vscode.workspace.getConfiguration('gemini-cli-vscode.magusCouncil');
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

        const config = vscode.workspace.getConfiguration('gemini-cli-vscode.magusCouncil');
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
        const timestamp = new Date();
        const hh = String(timestamp.getHours()).padStart(2, '0');
        const mm = String(timestamp.getMinutes()).padStart(2, '0');
        const ss = String(timestamp.getSeconds()).padStart(2, '0');
        const timeStr = `${hh}:${mm}:${ss}`;
        const agentList = agents.join(', ');
        const header = `\n# [${timeStr}] - MAGUS Council → ${agentList}\n\n`;
        const content = prompt.trim();
        const formattedContent = `${header}${content}\n`;

        if (!fs.existsSync(historyPath)) {
            // Create new file without any header; filename already conveys the date
            fs.writeFileSync(historyPath, '');
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

    private async sendToTerminal(text: string, target: string): Promise<void> {
        // Implementation for sending text to terminal
        const terminal = vscode.window.terminals.find(t => t.name.toLowerCase().includes(target.toLowerCase()));
        if (terminal) {
            terminal.show();
            terminal.sendText(text);
        }
    }
    
    private async saveToHistory(content: string): Promise<void> {
        // Reuse existing save to history logic
        await this.savePromptToHistory(content, []);
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
        const scriptUri = asWebviewUri(this.context, webview, 'resources', 'promptComposer.js');
        const styleUri = asWebviewUri(this.context, webview, 'resources', 'promptComposer.css');
        const geminiIconUri = asWebviewUri(this.context, webview, 'images', 'icon.png');
        const claudeIconUri = asWebviewUri(this.context, webview, 'images', 'claude-logo.png');
        const codexIconUri = asWebviewUri(this.context, webview, 'images', 'codex-icon.png');
        const qwenIconUri = asWebviewUri(this.context, webview, 'images', 'qwen-color.svg');
        const nonce = createNonce();
        const cspContent = getCspMeta(webview, nonce, { allowInlineStyles: false });

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="${cspContent}">
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

    /**
     * Set prompt text in the composer (with retry mechanism)
     */
    public async setPromptText(text: string): Promise<void> {
        const maxRetries = 5;
        const retryDelay = 100;
        
        for (let i = 0; i < maxRetries; i++) {
            if (this.view && this.isReady) {
                // Send text to webview using legacy message format
                this.view.webview.postMessage({
                    type: 'composer/setPrompt',
                    payload: { text }
                });
                return;
            }
            
            // Wait for WebView to be ready
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        // Fallback: copy to clipboard
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage(
            'Text copied to clipboard. Please paste it into the MAGUS Council composer.'
        );
    }

}
