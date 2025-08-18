import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { TerminalManager } from '../../core/TerminalManager';
import { ConfigService } from '../../core/ConfigService';
import { CLIRegistry } from '../../cliRegistry';

describe('TerminalManager', () => {
    let terminalManager: TerminalManager;
    let configService: ConfigService;
    let cliRegistry: CLIRegistry;
    let sandbox: sinon.SinonSandbox;
    let mockTerminals: Map<string, vscode.Terminal>;
    let createTerminalStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        mockTerminals = new Map();
        
        // Mock ConfigService
        configService = sandbox.createStubInstance(ConfigService) as any;
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
        
        terminalManager = new TerminalManager(configService, cliRegistry);
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
        it('should use Panel for active placement', async () => {
            await terminalManager.getOrCreate('gemini', 'active');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.strictEqual(createOptions.location, vscode.TerminalLocation.Panel);
        });

        it('should respect grouping behavior for new placement', async () => {
            // Mock new grouping behavior
            (configService.get as sinon.SinonStub).withArgs('terminal.groupingBehavior', 'same').returns('new');
            
            await terminalManager.getOrCreate('gemini', 'new');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.strictEqual(createOptions.location, vscode.TerminalLocation.Editor);
        });

        it('should use Panel for same grouping behavior', async () => {
            // Mock same grouping behavior (default)
            (configService.get as sinon.SinonStub).withArgs('terminal.groupingBehavior', 'same').returns('same');
            
            await terminalManager.getOrCreate('gemini', 'new');
            
            const createOptions = createTerminalStub.firstCall.args[0];
            assert.strictEqual(createOptions.location, vscode.TerminalLocation.Panel);
        });
    });

    describe.skip('Paste and Enter with delays', () => {
        // Note: These tests are skipped because vscode.env.clipboard cannot be mocked in the test environment
        // The functionality is tested in integration tests instead
        let clipboardStub: sinon.SinonStub;
        let executeCommandStub: sinon.SinonStub;
        let setTimeoutStub: sinon.SinonStub;

        beforeEach(() => {
            clipboardStub = sandbox.stub();  // Initialize as stub
            executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
            setTimeoutStub = sandbox.stub(global, 'setTimeout');
            setTimeoutStub.callsFake((callback: Function) => {
                callback();
                return {} as any;
            });
        });

        it('should apply Claude-specific delay for long text', async () => {
            const terminal = await terminalManager.getOrCreate('claude', 'active');
            mockTerminals.set('claude-global', terminal);
            
            const longText = 'x'.repeat(2500);
            await terminalManager.pasteAndEnter('claude', longText);
            
            assert.strictEqual(clipboardStub.calledWith(longText), true);
            assert.strictEqual(executeCommandStub.calledWith('workbench.action.terminal.paste'), true);
            assert.strictEqual((terminal.sendText as sinon.SinonStub).calledWith('', true), true);
            
            // Check that correct delay was used (2500ms for long text)
            const calls = setTimeoutStub.getCalls();
            const enterDelayCall = calls.find(call => call.args[1] === 2500);
            assert.ok(enterDelayCall, 'Should use 2500ms delay for long Claude text');
        });

        it('should apply Gemini-specific delay', async () => {
            const terminal = await terminalManager.getOrCreate('gemini', 'active');
            mockTerminals.set('gemini-global', terminal);
            
            await terminalManager.pasteAndEnter('gemini', 'test prompt');
            
            assert.strictEqual((terminal.sendText as sinon.SinonStub).calledWith('', true), true);
            
            // Check that correct delay was used (600ms for Gemini)
            const calls = setTimeoutStub.getCalls();
            const enterDelayCall = calls.find(call => call.args[1] === 600);
            assert.ok(enterDelayCall, 'Should use 600ms delay for Gemini');
        });

        it('should apply default delay for Codex', async () => {
            const terminal = await terminalManager.getOrCreate('codex', 'active');
            mockTerminals.set('codex-global', terminal);
            
            await terminalManager.pasteAndEnter('codex', 'test prompt');
            
            assert.strictEqual((terminal.sendText as sinon.SinonStub).calledWith('', true), true);
            
            // Check that correct delay was used (100ms default)
            const calls = setTimeoutStub.getCalls();
            const enterDelayCall = calls.find(call => call.args[1] === 100);
            assert.ok(enterDelayCall, 'Should use 100ms delay for Codex');
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
});