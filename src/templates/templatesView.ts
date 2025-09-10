import * as vscode from 'vscode';
import { createNonce, getCspMeta, asWebviewUri, getLocalResourceRoots } from '../ui/webviewUtils';
import { TemplateService } from './templateService';
import { isWebviewToExtensionMessage, ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../types/ipc';

export class TemplatesViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'gemini-cli-vscode.templatesView';

    private view: vscode.WebviewView | undefined;
    private readonly templateService: TemplateService;
    private insertHandler?: (args: { content: string; position: 'head'|'cursor'|'tail'; replaceSelection?: boolean; sourceId?: string }) => Promise<void> | void;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.templateService = new TemplateService();
    }

    public setInsertHandler(handler: (args: { content: string; position: 'head'|'cursor'|'tail'; replaceSelection?: boolean; sourceId?: string }) => Promise<void> | void) {
        this.insertHandler = handler;
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: getLocalResourceRoots(this.context)
        };
        webviewView.title = 'Templates';
        webviewView.webview.html = this.getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (!isWebviewToExtensionMessage(message)) return;
            await this.handleMessage(message);
        });
    }

    private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
        const requestId = message.requestId;
        try {
            switch (message.command) {
                case 'templates/list': {
                    const { templates, total, hasMore } = await this.templateService.list(message.payload as any);
                    await this.send({ type: 'result', data: { templates, total, hasMore }, requestId, version: 1 });
                    break;
                }
                case 'templates/get': {
                    const template = await this.templateService.get((message as any).payload.id);
                    await this.send({ type: 'result', data: { template }, requestId, version: 1 });
                    break;
                }
                case 'templates/preview': {
                    const res = await this.templateService.preview((message as any).payload.id, (message as any).payload.values);
                    await this.send({ type: 'result', data: res, requestId, version: 1 });
                    break;
                }
                case 'templates/render': {
                    const res = await this.templateService.render((message as any).payload.id, (message as any).payload.values);
                    await this.send({ type: 'result', data: res, requestId, version: 1 });
                    break;
                }
                case 'composer/insertTemplate': {
                    if (!this.insertHandler) throw new Error('Insert handler is not available');
                    const payload: any = (message as any).payload || {};
                    const content: string = payload.content || '';
                    const position = payload.position || 'cursor';
                    const replacePrompt = !!payload.replacePrompt;
                    const sourceId = payload.sourceId;
                    await Promise.resolve(this.insertHandler({ content, position, replaceSelection: replacePrompt, sourceId } as any));
                    await this.send({ type: 'result', data: { inserted: true }, requestId, version: 1 });
                    break;
                }
                default:
                    throw new Error(`Unsupported command: ${(message as any).command}`);
            }
        } catch (error: any) {
            await this.send({ type: 'error', error: error?.message || 'Unknown error', requestId, version: 1 });
        }
    }

    private async send(payload: ExtensionToWebviewMessage): Promise<void> {
        if (!this.view) return;
        await this.view.webview.postMessage(payload);
    }

    private getHtml(webview: vscode.Webview): string {
        const nonce = createNonce();
        const csp = getCspMeta(webview, nonce, { allowInlineStyles: false });
        const styleUri = asWebviewUri(this.context, webview, 'resources', 'templatesPanel.css');
        const scriptUri = asWebviewUri(this.context, webview, 'resources', 'templatesPanel.js');
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta http-equiv="Content-Security-Policy" content="${csp}">
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link href="${styleUri}" rel="stylesheet" />
            <title>Templates</title>
        </head>
        <body>
            <div class="tpl-root">
                <div class="tpl-toolbar">
                    <div class="tpl-search-wrap">
                        <input id="tpl-search" type="text" placeholder="Search templates..." />
                        <button id="tpl-clear-refresh" class="icon-btn" aria-label="Refresh" title="Refresh">⟳</button>
                    </div>
                </div>
                <div class="tpl-main">
                    <div class="tpl-list" id="tpl-list" role="list"></div>
                </div>
            </div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
