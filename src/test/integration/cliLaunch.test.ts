import * as assert from 'assert';
import * as vscode from 'vscode';

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
    
    before(async function() {
        // Extension should already be activated by VS Code test runner
        // Wait for commands to be registered
        await waitFor(
            async () => {
                const commands = await vscode.commands.getCommands();
                return commands.includes('gemini-cli-vscode.gemini.start.newPane');
            },
            { timeout: 5000, interval: 100 }
        );
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
            
            // First launch
            await vscode.commands.executeCommand('gemini-cli-vscode.gemini.start.activePane');
            
            // Wait for terminal to be created by name (more reliable than count)
            await waitFor(
                () => findTerminalByName('Gemini') !== undefined,
                { timeout: 10000, interval: 200 }
            );
            
            const countAfterFirst = vscode.window.terminals.length;
            const firstTerminal = findTerminalByName('Gemini');
            
            // Second launch should reuse
            await vscode.commands.executeCommand('gemini-cli-vscode.gemini.start.activePane');
            
            // Give some time to ensure no new terminal is created
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Verify terminal count did not increase and same terminal exists
            assert.strictEqual(
                vscode.window.terminals.length,
                countAfterFirst,
                'Should reuse existing terminal'
            );
            
            const secondTerminal = findTerminalByName('Gemini');
            assert.strictEqual(
                secondTerminal,
                firstTerminal,
                'Should be the same terminal instance'
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
            
            // Execute launch all command
            await vscode.commands.executeCommand('gemini-cli-vscode.launchAllCLIs');
            
            // Wait for terminals to be created by checking names (more reliable)
            await waitFor(
                () => {
                    const hasGemini = findTerminalByName('Gemini') !== undefined;
                    const hasCodex = findTerminalByName('Codex') !== undefined;
                    const hasClaude = findTerminalByName('Claude') !== undefined;
                    return hasGemini && hasCodex && hasClaude;
                },
                { timeout: 15000, interval: 500 }
            );
            
            // Verify terminals were created for different CLIs
            const geminiTerminal = findTerminalByName('Gemini');
            const codexTerminal = findTerminalByName('Codex');
            const claudeTerminal = findTerminalByName('Claude');
            
            assert.ok(geminiTerminal, 'Should create Gemini terminal');
            assert.ok(codexTerminal, 'Should create Codex terminal');
            assert.ok(claudeTerminal, 'Should create Claude terminal');
            
            // Verify they are different terminals
            assert.notStrictEqual(geminiTerminal, codexTerminal, 'Gemini and Codex should be different');
            assert.notStrictEqual(geminiTerminal, claudeTerminal, 'Gemini and Claude should be different');
            assert.notStrictEqual(codexTerminal, claudeTerminal, 'Codex and Claude should be different');
        });
    });
});