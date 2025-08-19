import * as assert from 'assert';
import * as vscode from 'vscode';
import { activate, deactivate } from '../../extension';
import { createMockContext } from '../mocks/vscode';

describe('MultiAI Integration Test Suite', () => {
    let extensionContext: vscode.ExtensionContext;

    before(() => {
        extensionContext = createMockContext();
        activate(extensionContext);
    });

    after(() => {
        deactivate();
    });
    
    it('should register multiAI commands', async () => {
        // Get all registered commands
        const commands = await vscode.commands.getCommands(true);
        
        // Check if our MultiAI commands are registered
        assert.ok(commands.includes('gemini-cli-vscode.multiAI.openComposer'), 
            'openComposer command should be registered');
        assert.ok(commands.includes('gemini-cli-vscode.multiAI.askAll'), 
            'askAll command should be registered');
    });

    it('should be able to execute openComposer command', async () => {
        // This test verifies the command can be executed without errors
        // In a real scenario, it would open the input box
        try {
            await vscode.commands.executeCommand('gemini-cli-vscode.multiAI.openComposer');
            assert.ok(true, 'Command executed without error');
        } catch (error) {
            assert.fail(`Command execution failed: ${error}`);
        }
    });

    it('should be able to execute askAll command', async () => {
        // This test verifies the command can be executed without errors
        try {
            await vscode.commands.executeCommand('gemini-cli-vscode.multiAI.askAll');
            assert.ok(true, 'Command executed without error');
        } catch (error) {
            assert.fail(`Command execution failed: ${error}`);
        }
    });
});
