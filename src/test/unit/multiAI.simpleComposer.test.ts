import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SimpleComposer } from '../../multiAI/simpleComposer';

// Use describe/it instead of suite/test for better compatibility
describe('SimpleComposer Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let simpleComposer: SimpleComposer;
    let mockFileHandler: any;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Create mock FileHandler
        mockFileHandler = {
            broadcastToMultipleClis: sandbox.stub()
        };
        
        simpleComposer = new SimpleComposer(mockFileHandler);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should open input box and broadcast to selected agents', async () => {
        // Arrange
        const prompt = 'Test prompt for AI';
        const selectedAgents = ['gemini', 'codex'];
        
        // Mock vscode.window.showInputBox
        const inputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
        inputBoxStub.resolves(prompt);
        
        // Mock vscode.window.showQuickPick
        const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        quickPickStub.resolves([
            { label: 'Gemini', picked: true, description: 'Google Gemini AI' },
            { label: 'Codex', picked: true, description: 'OpenAI Codex' }
        ] as any);
        
        // Act
        await simpleComposer.openAndAsk();
        
        // Assert
        assert.strictEqual(inputBoxStub.callCount, 1);
        assert.strictEqual(quickPickStub.callCount, 1);
        assert.strictEqual(mockFileHandler.broadcastToMultipleClis.callCount, 1);
        assert.deepStrictEqual(
            mockFileHandler.broadcastToMultipleClis.firstCall.args[0],
            prompt
        );
        assert.deepStrictEqual(
            mockFileHandler.broadcastToMultipleClis.firstCall.args[1],
            selectedAgents
        );
    });

    it('should handle cancelled input', async () => {
        // Arrange
        const inputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
        inputBoxStub.resolves(undefined); // User cancelled
        
        // Act
        await simpleComposer.openAndAsk();
        
        // Assert
        assert.strictEqual(inputBoxStub.callCount, 1);
        assert.strictEqual(mockFileHandler.broadcastToMultipleClis.callCount, 0);
    });

    it('should handle no agents selected', async () => {
        // Arrange
        const prompt = 'Test prompt';
        
        const inputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
        inputBoxStub.resolves(prompt);
        
        const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        quickPickStub.resolves([] as any); // No agents selected
        
        const warningStub = sandbox.stub(vscode.window, 'showWarningMessage');
        
        // Act
        await simpleComposer.openAndAsk();
        
        // Assert
        assert.strictEqual(warningStub.callCount, 1);
        assert.ok(warningStub.firstCall.args[0].includes('No agents selected'));
        assert.strictEqual(mockFileHandler.broadcastToMultipleClis.callCount, 0);
    });

    it('should use default agents when provided', async () => {
        // Arrange
        const prompt = 'Test prompt';
        const defaultAgents = ['gemini', 'claude'] as ('gemini' | 'codex' | 'claude')[];
        
        const inputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
        inputBoxStub.resolves(prompt);
        
        // Act
        await simpleComposer.askWithDefaults(prompt, defaultAgents);
        
        // Assert
        assert.strictEqual(mockFileHandler.broadcastToMultipleClis.callCount, 1);
        assert.deepStrictEqual(
            mockFileHandler.broadcastToMultipleClis.firstCall.args[0],
            prompt
        );
        assert.deepStrictEqual(
            mockFileHandler.broadcastToMultipleClis.firstCall.args[1],
            defaultAgents
        );
    });
});