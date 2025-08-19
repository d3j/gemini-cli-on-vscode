import * as vscode from 'vscode';

/**
 * Generate a nonce for CSP
 */
export function createNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * Get CSP meta tag content
 */
export function getCspMeta(
    webview: vscode.Webview,
    nonce: string,
    opts?: { allowInlineStyles?: boolean }
): string {
    const styleSource = opts?.allowInlineStyles 
        ? `${webview.cspSource} 'unsafe-inline'`
        : webview.cspSource;
    
    return `default-src 'none'; ` +
           `img-src ${webview.cspSource} https: data:; ` +
           `style-src ${styleSource}; ` +
           `script-src 'nonce-${nonce}';`;
}

/**
 * Convert local file path to webview URI
 */
export function asWebviewUri(
    context: vscode.ExtensionContext,
    webview: vscode.Webview,
    ...pathSegments: string[]
): vscode.Uri {
    const resourcePath = vscode.Uri.joinPath(context.extensionUri, ...pathSegments);
    return webview.asWebviewUri(resourcePath);
}

/**
 * Get local resource roots for webview
 */
export function getLocalResourceRoots(context: vscode.ExtensionContext): vscode.Uri[] {
    return [
        vscode.Uri.joinPath(context.extensionUri, 'resources'),
        vscode.Uri.joinPath(context.extensionUri, 'images'),
        vscode.Uri.joinPath(context.extensionUri, 'media')
    ];
}