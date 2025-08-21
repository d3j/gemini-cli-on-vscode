import * as vscode from 'vscode';
import { ExtensionBootstrap } from './core/ExtensionBootstrap';

let activatedFlag = false;
let bootstrap: ExtensionBootstrap | undefined;

export async function activate(context: vscode.ExtensionContext) {
    // Prevent double activation
    if (activatedFlag) {
        return;
    }
    activatedFlag = true;
    
    // Dispose existing bootstrap if any
    if (bootstrap) {
        bootstrap.dispose();
        bootstrap = undefined;
    }
    
    // Initialize extension
    bootstrap = new ExtensionBootstrap();
    await bootstrap.initialize(context);
}

export function deactivate() {
    // Dispose bootstrap
    try {
        // Reset ready state context key
        vscode.commands.executeCommand('setContext', 'gemini-cli-vscode.isReady', false);
        
        bootstrap?.dispose();
        bootstrap = undefined;
    } catch (error) {
        console.error('Error during deactivation:', error);
    } finally {
        // Reset activation flag
        activatedFlag = false;
    }
}