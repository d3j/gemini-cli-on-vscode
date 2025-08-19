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

/**
 * Webview to Extension messages
 */
export type WebviewToExtensionMessage = ComposerMessage;

/**
 * Extension to Webview messages
 */
export type ExtensionToWebviewMessage = 
    ({ type: 'stateUpdate'; terminals: TerminalInfo[] } |
     { type: 'result'; success: boolean; error?: string } |
     { type: 'error'; error: string; code?: string } |
     { type: 'terminalsUpdate'; terminals: string[] })
    & { requestId?: string; version?: 1 };

/**
 * Type guard for Webview to Extension messages
 */
export function isWebviewToExtensionMessage(msg: any): msg is WebviewToExtensionMessage {
    return msg?.command !== undefined &&
           ['sendToTerminal', 'saveHistory', 'clearPrompt', 'updateTerminals'].includes(msg.command);
}

/**
 * Type guard for Extension to Webview messages
 */
export function isExtensionToWebviewMessage(msg: any): msg is ExtensionToWebviewMessage {
    return msg?.type !== undefined &&
           ['stateUpdate', 'result', 'error', 'terminalsUpdate'].includes(msg.type);
}

/**
 * Helper for exhaustive type checking
 */
export function assertNever(x: never): never {
    throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}

/**
 * Legacy message types for backward compatibility
 */
export interface LegacyComposerMessage {
    command: 'sendToTerminal' | 'saveHistory' | 'clearPrompt' | 'updateTerminals';
    text?: string;
    terminal?: string;
    terminals?: string[];
}

/**
 * Convert legacy message to new format
 */
export function fromLegacyMessage(msg: LegacyComposerMessage): ComposerMessage {
    const base = { requestId: undefined, version: 1 as const };
    
    switch (msg.command) {
        case 'sendToTerminal':
            return {
                ...base,
                command: 'sendToTerminal',
                text: msg.text || '',
                terminal: msg.terminal || ''
            };
        case 'saveHistory':
            return {
                ...base,
                command: 'saveHistory',
                text: msg.text || ''
            };
        case 'clearPrompt':
            return {
                ...base,
                command: 'clearPrompt'
            };
        case 'updateTerminals':
            return {
                ...base,
                command: 'updateTerminals',
                terminals: msg.terminals || []
            };
        default:
            throw new Error(`Unknown legacy command: ${(msg as any).command}`);
    }
}