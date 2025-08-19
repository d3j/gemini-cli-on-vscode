import * as assert from 'assert';
import * as vscode from 'vscode';
import { activate } from '../../extension';

/**
 * Wait for a condition to be true
 */
async function waitFor(
    condition: () => boolean | Promise<boolean>,
    options = { timeout: 5000, interval: 100 }
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < options.timeout) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, options.interval));
    }
    throw new Error(`Timeout waiting for condition after ${options.timeout}ms`);
}

/**
 * Find terminal by name prefix
 */
function findTerminalByName(namePrefix: string): vscode.Terminal | undefined {
    return vscode.window.terminals.find(t => t.name.includes(namePrefix));
}

describe('E2E: CLI Launch', function() {
    // Set longer timeout for E2E tests
    this.timeout(60000);
    
    let extensionContext: vscode.ExtensionContext;
    
    before(async function() {
        // Create mock extension context
        extensionContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file(__dirname),
            extensionPath: __dirname,
            globalState: {
                get: () => undefined,
                update: async () => {},
                keys: () => [],
                setKeysForSync: () => {}
            },
            workspaceState: {
                get: () => undefined,
                update: async () => {},
                keys: () => []
            },
            extensionMode: vscode.ExtensionMode.Test,
            storagePath: undefined,
            globalStoragePath: __dirname,
            logPath: __dirname,
            asAbsolutePath: (path: string) => path,
            storageUri: vscode.Uri.file(__dirname),
            globalStorageUri: vscode.Uri.file(__dirname),
            logUri: vscode.Uri.file(__dirname),
            extension: {
                id: 'test.extension',
                extensionUri: vscode.Uri.file(__dirname),
                extensionPath: __dirname,
                isActive: true,
                packageJSON: { version: '0.0.1' },
                extensionKind: vscode.ExtensionKind.Workspace,
                exports: undefined,
                activate: async () => {}
            },
            environmentVariableCollection: {
                persistent: false,
                replace: () => {},
                append: () => {},
                prepend: () => {},
                get: () => undefined,
                forEach: () => {},
                delete: () => {},
                clear: () => {},
                getScoped: () => ({
                    persistent: false,
                    replace: () => {},
                    append: () => {},
                    prepend: () => {},
                    get: () => undefined,
                    forEach: () => {},
                    delete: () => {},
                    clear: () => {}
                })
            },
            secrets: {
                get: async () => undefined,
                store: async () => {},
                delete: async () => {},
                onDidChange: new vscode.EventEmitter().event
            },
            languageModelAccessInformation: {
                canSendRequest: () => undefined,
                onDidChange: new vscode.EventEmitter().event
            }
        } as any;
        
        // Activate extension
        await activate(extensionContext);
    });
    
    after(async function() {
        // Clean up: close all terminals
        vscode.window.terminals.forEach(terminal => {
            terminal.dispose();
        });
        
        // Wait for terminals to close
        await waitFor(
            () => vscode.window.terminals.length === 0,
            { timeout: 5000, interval: 100 }
        );
    });
    
    describe('Gemini CLI', () => {
        it('should launch Gemini CLI in editor pane', async () => {
            const initialCount = vscode.window.terminals.length;
            
            // Execute command to launch Gemini CLI
            await vscode.commands.executeCommand('gemini-cli-vscode.gemini.start.newPane');
            
            // Wait for terminal to be created
            await waitFor(
                () => vscode.window.terminals.length > initialCount,
                { timeout: 5000, interval: 100 }
            );
            
            // Verify terminal was created
            const newTerminal = findTerminalByName('Gemini');
            assert.ok(newTerminal, 'Should create a terminal with "Gemini" in the name');
            
            // Verify terminal count increased
            assert.strictEqual(
                vscode.window.terminals.length,
                initialCount + 1,
                'Should have created exactly one new terminal'
            );
        });
        
        it('should reuse existing terminal when using active placement', async () => {
            const initialCount = vscode.window.terminals.length;
            
            // First launch
            await vscode.commands.executeCommand('gemini-cli-vscode.gemini.start.activePane');
            
            await waitFor(
                () => vscode.window.terminals.length > initialCount,
                { timeout: 5000, interval: 100 }
            );
            
            const countAfterFirst = vscode.window.terminals.length;
            
            // Second launch should reuse
            await vscode.commands.executeCommand('gemini-cli-vscode.gemini.start.activePane');
            
            // Give some time to ensure no new terminal is created
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify terminal count did not increase
            assert.strictEqual(
                vscode.window.terminals.length,
                countAfterFirst,
                'Should reuse existing terminal'
            );
        });
    });
    
    describe('Multiple CLIs', () => {
        it('should launch multiple CLIs independently', async () => {
            const initialCount = vscode.window.terminals.length;
            
            // Launch Codex CLI
            await vscode.commands.executeCommand('gemini-cli-vscode.codex.start.newPane');
            
            await waitFor(
                () => vscode.window.terminals.length > initialCount,
                { timeout: 5000, interval: 100 }
            );
            
            // Launch Claude CLI
            await vscode.commands.executeCommand('gemini-cli-vscode.claude.start.newPane');
            
            await waitFor(
                () => vscode.window.terminals.length > initialCount + 1,
                { timeout: 5000, interval: 100 }
            );
            
            // Verify both terminals exist
            const codexTerminal = findTerminalByName('Codex');
            const claudeTerminal = findTerminalByName('Claude');
            
            assert.ok(codexTerminal, 'Should create Codex terminal');
            assert.ok(claudeTerminal, 'Should create Claude terminal');
            assert.notStrictEqual(codexTerminal, claudeTerminal, 'Terminals should be different');
        });
    });
    
    describe('Launch All CLIs', () => {
        it('should launch all enabled CLIs with single command', async () => {
            const initialCount = vscode.window.terminals.length;
            
            // Execute launch all command
            await vscode.commands.executeCommand('gemini-cli-vscode.launchAllCLIs');
            
            // Wait for multiple terminals to be created
            // Assuming at least 3 CLIs are enabled by default
            await waitFor(
                () => vscode.window.terminals.length >= initialCount + 3,
                { timeout: 10000, interval: 200 }
            );
            
            // Verify terminals were created for different CLIs
            const geminiTerminal = findTerminalByName('Gemini');
            const codexTerminal = findTerminalByName('Codex');
            const claudeTerminal = findTerminalByName('Claude');
            
            assert.ok(geminiTerminal, 'Should create Gemini terminal');
            assert.ok(codexTerminal, 'Should create Codex terminal');
            assert.ok(claudeTerminal, 'Should create Claude terminal');
        });
    });
});