import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { TerminalManager } from '../../core/TerminalManager';
import { ConfigService } from '../../core/ConfigService';
import { CLIRegistry } from '../../cliRegistry';

describe('TerminalManager', () => {
    let terminalManager: TerminalManager;
    let mockContext: vscode.ExtensionContext;
    let configService: ConfigService;
    let cliRegistry: CLIRegistry;
    let sandbox: sinon.SinonSandbox;
    let mockTerminals: Map<string, vscode.Terminal>;
    let createTerminalStub: sinon.SinonStub;
    let getStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        mockTerminals = new Map();
        
        // Mock ExtensionContext
        mockContext = {
            extensionUri: vscode.Uri.file('/test/extension'),
            subscriptions: []
        } as any;
        
        // Mock ConfigService
        configService = sandbox.createStubInstance(ConfigService) as any;
        getStub = (configService.get as sinon.SinonStub).callsFake((_key: string, defaultValue: any) => defaultValue);
        (configService.getCliDelay as sinon.SinonStub).callsFake((cli, textLength) => {
            if (cli === 'claude') {
                if (textLength > 2000) return 2500;
                if (textLength > 1000) return 1500;
                return 150;
            }
            if (cli === 'gemini') return 600;
            return 100;
        });
        
        // Mock CLIRegistry
        cliRegistry = sandbox.createStubInstance(CLIRegistry) as any;
        (cliRegistry.getCLI as sinon.SinonStub).callsFake((type) => ({
            id: type,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} CLI`,
            command: type,
            args: [],
            icon: `${type}-icon.png`,
            enabled: true
        }));
        (cliRegistry.getCommand as sinon.SinonStub).callsFake((type) => type);
        
        // Mock vscode.window.createTerminal
        createTerminalStub = sandbox.stub(vscode.window, 'createTerminal').callsFake((options: any) => {
            const terminal = {
                name: options.name,
                processId: Promise.resolve(1234),
                creationOptions: options,
                exitStatus: undefined,
                state: { isInteractedWith: false },
                sendText: sandbox.stub(),
                show: sandbox.stub(),
                hide: sandbox.stub(),
                dispose: sandbox.stub()
            } as any;
            return terminal;
        });
        
        // Mock vscode.window.terminals
        Object.defineProperty(vscode.window, 'terminals', {
            get: () => Array.from(mockTerminals.values()),
            configurable: true
        });
        
        terminalManager = new TerminalManager(mockContext, configService, cliRegistry);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Terminal creation and reuse', () => {
        it('should create new terminal for first request', async () => {
            const terminal = await terminalManager.getOrCreate('gemini', 'new');
            
            assert.ok(terminal);
            assert.strictEqual(createTerminalStub.calledOnce, true);
            assert.strictEqual(terminal.name, 'Gemini CLI');
        });

        it('should reuse existing terminal for same CLI', async () => {
            const terminal1 = await terminalManager.getOrCreate('gemini', 'active');
            mockTerminals.set('gemini-global', terminal1);
            
            const terminal2 = await terminalManager.getOrCreate('gemini', 'active');
            
            assert.strictEqual(terminal1, terminal2);
            assert.strictEqual(createTerminalStub.calledOnce, true);
        });

        it('should create new terminal if placement is "new"', async () => {
            const terminal1 = await terminalManager.getOrCreate('gemini', 'new');
            mockTerminals.set('gemini-global-1', terminal1);
            
            const terminal2 = await terminalManager.getOrCreate('gemini', 'new');
            
            assert.notStrictEqual(terminal1, terminal2);
            assert.strictEqual(createTerminalStub.calledTwice, true);
        });

        it('should handle terminal with exitStatus', async () => {
            const terminal1 = await terminalManager.getOrCreate('gemini', 'active');
            // Mock exitStatus as a getter
            Object.defineProperty(terminal1, 'exitStatus', {
                get: () => ({ code: 0 }),
                configurable: true
            });
            mockTerminals.set('gemini-global', terminal1);
            
            const terminal2 = await terminalManager.getOrCreate('gemini', 'active');
            
            assert.notStrictEqual(terminal1, terminal2);
            assert.strictEqual(createTerminalStub.calledTwice, true);
        });
    });

    describe('Terminal placement', () => {
        it('should use ViewColumn.Active for same grouping behavior', async () => {
            // Mock same grouping behavior (default)
            (configService.get as sinon.SinonStub).withArgs('terminal.groupingBehavior', 'same').returns('same');
            
            await terminalManager.getOrCreate('gemini', 'active');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.ok(createOptions.location, 'Location should be set');
            assert.strictEqual(createOptions.location.viewColumn, vscode.ViewColumn.Active, 
                'Should use Active view column for same grouping');
        });

        it('should use ViewColumn.Beside for new grouping behavior', async () => {
            // Mock new grouping behavior
            (configService.get as sinon.SinonStub).withArgs('terminal.groupingBehavior', 'same').returns('new');
            
            await terminalManager.getOrCreate('gemini', 'new');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.ok(createOptions.location, 'Location should be set');
            assert.strictEqual(createOptions.location.viewColumn, vscode.ViewColumn.Beside,
                'Should use Beside view column for new grouping');
        });

        it('should respect grouping behavior for all CLI types', async () => {
            // Test with 'new' grouping behavior
            (configService.get as sinon.SinonStub).withArgs('terminal.groupingBehavior', 'same').returns('new');
            
            await terminalManager.getOrCreate('claude', 'active');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.ok(createOptions.location, 'Location should be set');
            assert.strictEqual(createOptions.location.viewColumn, vscode.ViewColumn.Beside,
                'Should use Beside view column for new grouping behavior');
        });
    });

    describe('Terminal icon paths', () => {
        it('should set correct icon path for terminals', async () => {
            await terminalManager.getOrCreate('gemini', 'active');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.ok(createOptions.iconPath, 'Icon path should be set');
            assert.ok(createOptions.iconPath.path.includes('images'), 'Icon path should include images directory');
            assert.ok(createOptions.iconPath.path.includes('gemini-icon.png'), 'Icon path should include correct icon file');
        });

        it('should use extension URI for icon path', async () => {
            await terminalManager.getOrCreate('claude', 'active');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.ok(createOptions.iconPath, 'Icon path should be set');
            assert.ok(createOptions.iconPath.path.includes('/test/extension'), 'Icon path should use extension URI');
            assert.ok(createOptions.iconPath.path.includes('claude-icon.png'), 'Icon path should include correct icon file');
        });
    });

    describe('Terminal persistence settings', () => {
        it('should set isTransient to true to prevent persistence', async () => {
            await terminalManager.getOrCreate('gemini', 'active');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.strictEqual(createOptions.isTransient, true, 
                'isTransient should be true to prevent terminal persistence on VS Code restart');
        });

        it('should set hideFromUser to false to show in dropdown', async () => {
            await terminalManager.getOrCreate('codex', 'active');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.strictEqual(createOptions.hideFromUser, false,
                'hideFromUser should be false to show terminal in dropdown');
        });

        it('should set empty env to prevent restoration', async () => {
            await terminalManager.getOrCreate('claude', 'active');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.deepStrictEqual(createOptions.env, {},
                'env should be empty object to prevent terminal restoration');
        });

        it('should apply persistence settings for all CLI types', async () => {
            const cliTypes: Array<'gemini' | 'codex' | 'claude' | 'qwen'> = ['gemini', 'codex', 'claude', 'qwen'];
            
            for (const cli of cliTypes) {
                createTerminalStub.resetHistory();
                await terminalManager.getOrCreate(cli, 'active');
                
                const createOptions = createTerminalStub.firstCall.args[0];
                assert.strictEqual(createOptions.isTransient, true, 
                    `${cli}: isTransient should be true`);
                assert.strictEqual(createOptions.hideFromUser, false,
                    `${cli}: hideFromUser should be false`);
                assert.deepStrictEqual(createOptions.env, {},
                    `${cli}: env should be empty`);
            }
        });
    });

    describe('Working directory command', () => {
        it('should send default cwd command with workspace path', async () => {
            sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file('/test/workspace') } as any]);

            const terminal = await terminalManager.getOrCreate('gemini', 'active');

            const sendTextStub = terminal.sendText as sinon.SinonStub;
            assert.strictEqual(sendTextStub.firstCall.args[0], 'cd "/test/workspace"');
        });

        it('should allow customizing cwd command', async () => {
            sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file('/test/workspace') } as any]);
            getStub.withArgs('terminal.cwdCommand', sinon.match.any).returns('cd {path}/..');

            const terminal = await terminalManager.getOrCreate('gemini', 'active');

            const sendTextStub = terminal.sendText as sinon.SinonStub;
            assert.strictEqual(sendTextStub.firstCall.args[0], 'cd /test/workspace/..');
        });
    });


    describe('Send text', () => {
        it('should send text to terminal', async () => {
            const terminal = await terminalManager.getOrCreate('gemini', 'active');
            mockTerminals.set('gemini-global', terminal);
            
            await terminalManager.sendText('gemini', 'test text');
            
            assert.strictEqual((terminal.sendText as sinon.SinonStub).calledWith('test text', true), true);
        });

        it('should send text without enter when specified', async () => {
            const terminal = await terminalManager.getOrCreate('gemini', 'active');
            mockTerminals.set('gemini-global', terminal);
            
            await terminalManager.sendText('gemini', 'test text', { enter: false });
            
            assert.strictEqual((terminal.sendText as sinon.SinonStub).calledWith('test text', false), true);
        });

        it('should throw error if terminal not found', async () => {
            await assert.rejects(
                terminalManager.sendText('gemini', 'test text'),
                /No terminal found for CLI: gemini/
            );
        });
    });

    describe('Find terminal', () => {
        it('should find existing terminal by CLI type', async () => {
            const terminal = await terminalManager.getOrCreate('gemini', 'active');
            mockTerminals.set('gemini-global', terminal);
            
            const found = terminalManager.findTerminal('gemini');
            assert.strictEqual(found, terminal);
        });

        it('should return undefined if terminal not found', () => {
            const found = terminalManager.findTerminal('gemini');
            assert.strictEqual(found, undefined);
        });
    });

    describe('Clear terminal', () => {
        it('should clear specific CLI terminal', async () => {
            const terminal = await terminalManager.getOrCreate('gemini', 'active');
            mockTerminals.set('gemini-global', terminal);
            
            terminalManager.clearTerminal('gemini');
            
            const found = terminalManager.findTerminal('gemini');
            assert.strictEqual(found, undefined);
        });

        it('should clear all terminals', async () => {
            const geminiTerminal = await terminalManager.getOrCreate('gemini', 'active');
            const claudeTerminal = await terminalManager.getOrCreate('claude', 'active');
            mockTerminals.set('gemini-global', geminiTerminal);
            mockTerminals.set('claude-global', claudeTerminal);
            
            terminalManager.clearAll();
            
            assert.strictEqual(terminalManager.findTerminal('gemini'), undefined);
            assert.strictEqual(terminalManager.findTerminal('claude'), undefined);
        });
    });

    describe('Disposal', () => {
        it('should dispose all resources', () => {
            const disposeStub = sandbox.stub();
            terminalManager['disposables'] = [{ dispose: disposeStub }];
            
            terminalManager.dispose();
            
            assert.strictEqual(disposeStub.calledOnce, true);
        });
    });

    describe('Paste and Enter', () => {
        it('should paste text then send enter with delay', async () => {
            // Arrange: create a terminal for gemini
            const terminal = await terminalManager.getOrCreate('gemini', 'active');
            // Only stub paste command; clipboard API may be non-configurable in VS Code test env
            const execCmd = sandbox.stub(vscode.commands, 'executeCommand').resolves();

            // Act
            await terminalManager.pasteAndEnter('gemini', 'Hello');

            // Assert: paste was invoked and Enter was sent
            assert.ok(execCmd.calledWith('workbench.action.terminal.paste'));
            assert.ok((terminal.sendText as sinon.SinonStub).calledWith('', true));
        });
    });
});
