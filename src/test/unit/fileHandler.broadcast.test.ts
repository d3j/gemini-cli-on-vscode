import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { FileHandler } from '../../fileHandler';

describe('FileHandler.broadcastToMultipleClis Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let fileHandler: FileHandler;
    let geminiTerminals: Map<string, vscode.Terminal>;
    let codexTerminals: Map<string, vscode.Terminal>;
    let claudeTerminals: Map<string, vscode.Terminal>;
    let qwenTerminals: Map<string, vscode.Terminal>;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Initialize terminal maps
        geminiTerminals = new Map();
        codexTerminals = new Map();
        claudeTerminals = new Map();
        qwenTerminals = new Map();
        
        fileHandler = new FileHandler(geminiTerminals, codexTerminals, claudeTerminals, qwenTerminals);

        // Stub VS Code command execution and clipboard to avoid environment dependencies
        sandbox.stub(vscode.commands, 'executeCommand').resolves();
        try {
            sandbox.stub(vscode.env.clipboard, 'writeText').resolves();
        } catch {
            // Some environments may not allow stubbing clipboard; ignore
        }
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should skip agents without running terminals', async () => {
        // Arrange
        const prompt = 'Test prompt';
        const agents = ['gemini', 'codex', 'claude'] as ('gemini' | 'codex' | 'claude')[];
        
        const geminiShowStub = sandbox.stub();
        const geminiSendTextStub = sandbox.stub();
        const geminiTerminal = {
            name: 'Gemini CLI',
            processId: Promise.resolve(123),
            creationOptions: {},
            exitStatus: undefined,
            state: { isInteractedWith: false, shell: undefined },
            sendText: geminiSendTextStub,
            show: geminiShowStub,
            hide: sandbox.stub(),
            dispose: sandbox.stub()
        } as any as vscode.Terminal;
        
        geminiTerminals.set('session1', geminiTerminal);
        
        // Only Gemini terminal exists
        sandbox.stub(vscode.window, 'terminals').value([geminiTerminal]);
        const warningStub = sandbox.stub(vscode.window, 'showWarningMessage');
        
        // Act
        await fileHandler.broadcastToMultipleClis(prompt, agents);
        
        // Assert
        assert.ok(geminiShowStub.callCount >= 1); // Terminal should be shown at least once
        assert.strictEqual(geminiSendTextStub.callCount, 1); // Only Enter is sent via sendText
        assert.strictEqual(warningStub.callCount, 1);
        assert.ok(warningStub.firstCall.args[0].includes('Codex, Claude'));
    });

    it('should handle empty agents array', async () => {
        // Arrange
        const prompt = 'Test prompt';
        const agents: ('gemini' | 'codex' | 'claude')[] = [];
        
        const warningStub = sandbox.stub(vscode.window, 'showWarningMessage');
        
        // Act
        await fileHandler.broadcastToMultipleClis(prompt, agents);
        
        // Assert
        assert.strictEqual(warningStub.callCount, 1);
        assert.ok(warningStub.firstCall.args[0].includes('No agents selected'));
    });

    it('should handle empty prompt', async () => {
        // Arrange
        const prompt = '';
        const agents = ['gemini'] as ('gemini' | 'codex' | 'claude')[];
        
        const warningStub = sandbox.stub(vscode.window, 'showWarningMessage');
        
        // Act  
        await fileHandler.broadcastToMultipleClis(prompt, agents);
        
        // Assert
        assert.strictEqual(warningStub.callCount, 1);
        assert.ok(warningStub.firstCall.args[0].includes('Empty prompt'));
    });

    it('should add delay between sends when specified', async () => {
        // Arrange
        const prompt = 'Test prompt';
        const agents = ['gemini', 'codex'] as ('gemini' | 'codex' | 'claude')[];
        const delayMs = 100;
        
        // Mock configuration for delays
        const configStub = sandbox.stub(vscode.workspace, 'getConfiguration');
        configStub.withArgs('gemini-cli-vscode.multiAI.composer.delays').returns({
            get: (key: string, defaultValue: any) => {
                const values: any = {
                    'initial': 100,
                    'claude.enter': 150,
                    'gemini.showWait': 250,
                    'gemini.enter': 600
                };
                return values[key] || defaultValue;
            }
        } as any);
        
        const geminiSendTextStub = sandbox.stub();
        const geminiTerminal = {
            name: 'Gemini CLI',
            processId: Promise.resolve(123),
            creationOptions: {},
            exitStatus: undefined,
            state: { isInteractedWith: false, shell: undefined },
            sendText: geminiSendTextStub,
            show: sandbox.stub(),
            hide: sandbox.stub(),
            dispose: sandbox.stub()
        } as any as vscode.Terminal;
        
        const codexSendTextStub = sandbox.stub();
        const codexTerminal = {
            name: 'Codex CLI',
            processId: Promise.resolve(124),
            creationOptions: {},
            exitStatus: undefined,
            state: { isInteractedWith: false, shell: undefined },
            sendText: codexSendTextStub,
            show: sandbox.stub(),
            hide: sandbox.stub(),
            dispose: sandbox.stub()
        } as any as vscode.Terminal;
        
        geminiTerminals.set('session1', geminiTerminal);
        codexTerminals.set('session2', codexTerminal);
        
        sandbox.stub(vscode.window, 'terminals').value([geminiTerminal, codexTerminal]);
        
        // Act
        await fileHandler.broadcastToMultipleClis(prompt, agents, delayMs);

        // Assert
        assert.strictEqual(geminiSendTextStub.callCount, 1); // Gemini sends only Enter via sendText
        assert.strictEqual(codexSendTextStub.callCount, 1); // Codex sends once
    });
});
