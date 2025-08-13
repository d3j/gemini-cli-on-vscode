import * as assert from 'assert';
import * as vscode from 'vscode';

suite('MultiAI Integration Test Suite', () => {
    
    test('should register multiAI commands', async () => {
        // Get all registered commands
        const commands = await vscode.commands.getCommands();
        
        // Check if our MultiAI commands are registered
        assert.ok(commands.includes('gemini-cli-vscode.multiAI.openComposer'), 
            'openComposer command should be registered');
        assert.ok(commands.includes('gemini-cli-vscode.multiAI.askAll'), 
            'askAll command should be registered');
    });

    test('should be able to execute openComposer command', async () => {
        // This test verifies the command can be executed without errors
        // In a real scenario, it would open the input box
        try {
            // Note: This will actually try to open the input box in test environment
            // We're just checking it doesn't throw an error
            await vscode.commands.executeCommand('gemini-cli-vscode.multiAI.openComposer');
            // Command executed successfully (even if user cancels)
            assert.ok(true, 'Command executed without error');
        } catch (error) {
            assert.fail(`Command execution failed: ${error}`);
        }
    });

    test('should be able to execute askAll command', async () => {
        // This test verifies the command can be executed without errors
        try {
            await vscode.commands.executeCommand('gemini-cli-vscode.multiAI.askAll');
            // Command executed successfully (even if user cancels)
            assert.ok(true, 'Command executed without error');
        } catch (error) {
            assert.fail(`Command execution failed: ${error}`);
        }
    });
});