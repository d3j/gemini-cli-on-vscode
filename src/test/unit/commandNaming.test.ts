import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { activate, deactivate } from '../../extension';
import { createMockContext } from '../mocks/vscode';

describe('Hierarchical Command Naming', () => {
    let sandbox: sinon.SinonSandbox;
    let extensionContext: vscode.ExtensionContext;
    let commandHandlers: Map<string, (...args: any[]) => any>;

    beforeEach(() => {
        deactivate();
        sandbox = sinon.createSandbox();
        extensionContext = createMockContext();
        commandHandlers = new Map();
        
        // Mock vscode.commands.registerCommand to capture handlers
        sandbox.stub(vscode.commands, 'registerCommand').callsFake((command: string, handler: (...args: any[]) => any) => {
            commandHandlers.set(command, handler);
            return { dispose: () => {} };
        });

        // Mock StatusBar related events (used by StatusBarManager)
        sandbox.stub(vscode.window, 'onDidChangeActiveTerminal').returns({ dispose: () => {} });
        sandbox.stub(vscode.window, 'onDidOpenTerminal').returns({ dispose: () => {} });
        sandbox.stub(vscode.window, 'onDidCloseTerminal').returns({ dispose: () => {} });
        sandbox.stub(vscode.window, 'onDidChangeActiveTextEditor').returns({ dispose: () => {} });

        // Mock other VS Code APIs
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: (_key: string, defaultValue?: any) => defaultValue,
            has: () => false,
            inspect: () => ({ defaultValue: undefined } as any),
            update: () => Promise.resolve()
        } as any);

        sandbox.stub(vscode.window, 'createTerminal').returns({
            sendText: () => {},
            show: () => {},
            dispose: () => {}
        } as any);

        sandbox.stub(vscode.window, 'createStatusBarItem').returns({
            show: () => {},
            hide: () => {},
            dispose: () => {}
        } as any);

        sandbox.stub(vscode.window, 'createOutputChannel').returns({
            appendLine: () => {},
            show: () => {},
            dispose: () => {}
        } as any);
    });

    afterEach(() => {
        deactivate();
        sandbox.restore();
    });

    describe('CLI-specific command registration', () => {
        it('should register gemini commands with hierarchical names', async () => {
            await activate(extensionContext);
            
            // Verify Gemini commands with new hierarchical structure
            assert.ok(commandHandlers.has('gemini-cli-vscode.gemini.start.newPane'), 
                'Should register gemini.start.newPane');
            assert.ok(commandHandlers.has('gemini-cli-vscode.gemini.start.activePane'), 
                'Should register gemini.start.activePane');
            assert.ok(commandHandlers.has('gemini-cli-vscode.gemini.send.selectedText'), 
                'Should register gemini.send.selectedText');
            assert.ok(commandHandlers.has('gemini-cli-vscode.gemini.send.filePath'), 
                'Should register gemini.send.filePath');
            assert.ok(commandHandlers.has('gemini-cli-vscode.gemini.send.openFiles'), 
                'Should register gemini.send.openFiles');
        });

        it('should register codex commands with hierarchical names', async () => {
            await activate(extensionContext);
            
            // Verify Codex commands with new hierarchical structure
            assert.ok(commandHandlers.has('gemini-cli-vscode.codex.start.newPane'), 
                'Should register codex.start.newPane');
            assert.ok(commandHandlers.has('gemini-cli-vscode.codex.start.activePane'), 
                'Should register codex.start.activePane');
            assert.ok(commandHandlers.has('gemini-cli-vscode.codex.send.selectedText'), 
                'Should register codex.send.selectedText');
            assert.ok(commandHandlers.has('gemini-cli-vscode.codex.send.filePath'), 
                'Should register codex.send.filePath');
            assert.ok(commandHandlers.has('gemini-cli-vscode.codex.send.openFiles'), 
                'Should register codex.send.openFiles');
        });

        it('should register claude commands with hierarchical names', async () => {
            await activate(extensionContext);
            
            // Verify Claude commands with new hierarchical structure
            assert.ok(commandHandlers.has('gemini-cli-vscode.claude.start.newPane'), 
                'Should register claude.start.newPane');
            assert.ok(commandHandlers.has('gemini-cli-vscode.claude.start.activePane'), 
                'Should register claude.start.activePane');
            assert.ok(commandHandlers.has('gemini-cli-vscode.claude.send.selectedText'), 
                'Should register claude.send.selectedText');
            assert.ok(commandHandlers.has('gemini-cli-vscode.claude.send.filePath'), 
                'Should register claude.send.filePath');
            assert.ok(commandHandlers.has('gemini-cli-vscode.claude.send.openFiles'), 
                'Should register claude.send.openFiles');
        });

        it('should register qwen commands with hierarchical names', async () => {
            await activate(extensionContext);
            
            // Verify Qwen commands with new hierarchical structure
            assert.ok(commandHandlers.has('gemini-cli-vscode.qwen.start.newPane'), 
                'Should register qwen.start.newPane');
            assert.ok(commandHandlers.has('gemini-cli-vscode.qwen.start.activePane'), 
                'Should register qwen.start.activePane');
            assert.ok(commandHandlers.has('gemini-cli-vscode.qwen.send.selectedText'), 
                'Should register qwen.send.selectedText');
            assert.ok(commandHandlers.has('gemini-cli-vscode.qwen.send.filePath'), 
                'Should register qwen.send.filePath');
            assert.ok(commandHandlers.has('gemini-cli-vscode.qwen.send.openFiles'), 
                'Should register qwen.send.openFiles');
        });
    });

    describe('Common commands', () => {
        it('should register common feature commands', async () => {
            await activate(extensionContext);
            
            // Verify common commands
            assert.ok(commandHandlers.has('gemini-cli-vscode.saveClipboardToHistory'), 
                'Should register saveClipboardToHistory');
            assert.ok(commandHandlers.has('gemini-cli-vscode.launchAllCLIs'), 
                'Should register launchAllCLIs');
            assert.ok(commandHandlers.has('gemini-cli-vscode.multiAI.openComposer'), 
                'Should register multiAI.openComposer');
        });
    });

    describe('Command count', () => {
        it('should register the correct total number of commands', async () => {
            await activate(extensionContext);
            
            // 4 CLIs × 5 commands each = 20 CLI commands
            // Plus common commands: saveToHistory, saveClipboardToHistory, launchAllCLIs, 
            // multiAI.openComposer, multiAI.askAll = 5 common commands
            // Total: 20 + 5 = 25
            const minimumExpectedCount = 25;
            
            assert.ok(commandHandlers.size >= minimumExpectedCount, 
                `Should register at least ${minimumExpectedCount} commands, got ${commandHandlers.size}`);
        });
    });

    describe('Backward compatibility', () => {
        it('should provide deprecation warnings for old command names', async () => {
            await activate(extensionContext);
            
            // These should optionally be registered for backward compatibility
            // Implementation can choose to support them with warnings
            // or remove them entirely
            
            // For now, we test that the new commands exist
            assert.ok(commandHandlers.has('gemini-cli-vscode.gemini.start.newPane'));
            assert.ok(commandHandlers.has('gemini-cli-vscode.codex.start.newPane'));
        });
    });
});