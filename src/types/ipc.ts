import { CLIType } from '../types';

/**
 * Terminal information sent to webview
 */
export interface TerminalInfo {
    id: string;
    name: string;
    cliType: CLIType;
    isActive: boolean;
}

/**
 * Option B: Simple Union types with cross type for request tracking
 */
export type ComposerMessage =
    ({ command: 'sendToTerminal'; text: string; terminal: string } |
     { command: 'saveHistory'; text: string } |
     { command: 'clearPrompt' } |
     { command: 'updateTerminals'; terminals: string[] })
    & { requestId?: string; version?: 1 };

// Template related message types (WebView -> Extension)
export type TemplatesRequestMessage =
    (
        { command: 'templates/list'; payload: {
            query?: string;
            tags?: string[];
            sources?: ('oss'|'user'|'history'|'shared'|'pack')[];
            limit?: number;
            offset?: number;
            sortBy?: 'name'|'created'|'updated'|'used';
            sortOrder?: 'asc'|'desc';
        }} |
        { command: 'templates/get'; payload: { id: string } } |
        { command: 'templates/preview'; payload: { id: string; values?: Record<string, any> } } |
        { command: 'templates/render'; payload: { id: string; values?: Record<string, any> } } |
        { command: 'templates/save'; payload: {
            id?: string;
            name: string;
            description?: string;
            content: string;
            tags?: string[];
            parameterized?: { inputs: any[] };
            overwrite?: boolean;
        }} |
        { command: 'templates/delete'; payload: { id: string } } |
        { command: 'templates/sync'; payload: { force?: boolean } } |
        { command: 'templates/export'; payload: { ids: string[]; format: 'yaml'|'json' } } |
        { command: 'templates/import'; payload: { content: string; format: 'yaml'|'json'; overwrite?: boolean } } |
        { command: 'history/list'; payload: { date?: string; limit?: number } } |
        { command: 'composer/insertTemplate'; payload: { content: string; position: 'head'|'cursor'|'tail'; replacePrompt?: boolean; sourceId?: string } }
    ) & { requestId?: string; version?: 1 };

/**
 * Webview to Extension messages
 */
export type WebviewToExtensionMessage = ComposerMessage | TemplatesRequestMessage;

/**
 * Extension to Webview messages
 */
export type ExtensionToWebviewMessage =
    ({ type: 'stateUpdate'; terminals: TerminalInfo[] } |
     { type: 'result'; success: boolean; error?: string } |
     { type: 'error'; error: string; code?: string } |
     { type: 'terminalsUpdate'; terminals: string[] } |
     { type: 'result'; data: any })
    & { requestId?: string; version?: 1 };

/**
 * Type guard for Webview to Extension messages
 */
export function isWebviewToExtensionMessage(msg: any): msg is WebviewToExtensionMessage {
    if (!msg || msg.command === undefined) return false;
    const allowed = new Set([
        'sendToTerminal', 'saveHistory', 'clearPrompt', 'updateTerminals',
        'templates/list', 'templates/get', 'templates/preview', 'templates/render',
        'templates/save', 'templates/delete', 'templates/sync', 'templates/export', 'templates/import',
        'history/list',
        'composer/insertTemplate'
    ]);
    return allowed.has(msg.command);
}

/**
 * Type guard for Extension to Webview messages
 */
export function isExtensionToWebviewMessage(msg: any): msg is ExtensionToWebviewMessage {
    return msg?.type !== undefined &&
           ['stateUpdate', 'result', 'error', 'terminalsUpdate'].includes(msg.type);
}
