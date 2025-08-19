import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { activate, deactivate } from '../../extension';
import { createMockContext } from '../mocks/vscode';
import { 
    createTestContext,
    cleanupTestContext
} from '../helpers/testUtils';

describe('E2E Integration Test Suite', () => {
    let testContext: ReturnType<typeof createTestContext>;
    let extensionContext: vscode.ExtensionContext;
    let originalEnv: NodeJS.ProcessEnv;

    before(() => {
        originalEnv = { ...process.env };
    });

    before(async () => {
        extensionContext = createMockContext();
        const commands = await vscode.commands.getCommands(true);
        if (!commands.includes('gemini-cli-vscode.gemini.start.newPane')) {
            activate(extensionContext);
        }
    });

    beforeEach(() => {
        testContext = createTestContext();
        // executeCommand のグローバルスタブはE2Eでは不正通過の原因になるため解除
        if (testContext.stubs.executeCommand && typeof testContext.stubs.executeCommand.restore === 'function') {
            testContext.stubs.executeCommand.restore();
        }
    });

    afterEach(() => {
        cleanupTestContext(testContext);
        process.env = originalEnv;
    });

    after(() => {
        try { 
            deactivate(); 
        } catch (error) {
            console.error('Error during deactivation:', error);
        }
    });

    describe('Full Workflow Tests', () => {
        it('Complete workflow: Save history with editor selection', async function() {
            this.timeout(5000);

            const fsStubs = {
                existsSync: testContext.sandbox.stub(fs, 'existsSync'),
                mkdirSync: testContext.sandbox.stub(fs, 'mkdirSync'),
                writeFileSync: testContext.sandbox.stub(fs, 'writeFileSync'),
                appendFileSync: testContext.sandbox.stub(fs, 'appendFileSync')
            };

            fsStubs.existsSync.returns(false);

            const mockTerminals: vscode.Terminal[] = [];
            const createTerminalStub = testContext.stubs.createTerminal;
            
            createTerminalStub.callsFake((options: vscode.TerminalOptions) => {
                const mockTerminal = {
                    name: options.name || 'Mock Terminal',
                    sendText: sinon.stub(),
                    show: sinon.stub(),
                    hide: sinon.stub(),
                    dispose: sinon.stub(),
                    processId: Promise.resolve(12345),
                    creationOptions: options,
                    exitStatus: undefined,
                    state: { isInteractedWith: false }
                };
                mockTerminals.push(mockTerminal as any);
                return mockTerminal as any;
            });

            testContext.sandbox.stub(vscode.window, 'terminals').get(() => mockTerminals);

            const wsPath = path.join(process.cwd(), '.private', 'dev-workspace', 'e2e-ws');
            try { 
                fs.mkdirSync(wsPath, { recursive: true }); 
            } catch (error) {
                console.error('Error creating workspace directory:', error);
            }
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file(wsPath),
                name: 'e2e-ws',
                index: 0
            };
            testContext.sandbox.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);

            // Skip terminal creation in E2E; focus on history save

            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/workspace/test.ts'),
                    getText: (range?: vscode.Range) => {
                        if (!range) return 'Full document content';
                        return 'Selected text';
                    }
                },
                selection: new vscode.Selection(0, 0, 0, 13)
            };
            testContext.sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);

            testContext.stubs.clipboardRead.resolves('Clipboard content');
            testContext.stubs.clipboardWrite.resolves();

            try {
                await vscode.commands.executeCommand('gemini-cli-vscode.saveClipboardToHistory');
                assert.ok(true, 'Command executed without error');
            } catch (e) {
                assert.fail(`saveClipboardToHistory should not throw: ${e}`);
            }

            // End-to-end send is covered elsewhere; here we stop after save
        });

        it('Multiple terminals management (smoke)', async function() {
            this.timeout(3000);
            // Only verify commands can be invoked without throwing
            await vscode.commands.executeCommand('gemini-cli-vscode.gemini.start.newPane');
            await vscode.commands.executeCommand('gemini-cli-vscode.gemini.start.activePane');
        });

        it('Terminal cleanup on close (smoke)', async function() {
            this.timeout(3000);
            // Only verify start command can be invoked multiple times without throwing
            await vscode.commands.executeCommand('gemini-cli-vscode.gemini.start.newPane');
            await vscode.commands.executeCommand('gemini-cli-vscode.gemini.start.newPane');
        });
    });

    describe('Error Handling', () => {
        it('Handles missing workspace gracefully (no selection)', async () => {
            // No workspace and no selection should show information message and not throw
            testContext.sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
            const mockEmptyEditor = {
                document: {
                    uri: vscode.Uri.file('/workspace/test.ts'),
                    getText: () => ''
                },
                selection: new vscode.Selection(0, 0, 0, 0)
            };
            testContext.sandbox.stub(vscode.window, 'activeTextEditor').value(mockEmptyEditor);

            await vscode.commands.executeCommand('gemini-cli-vscode.saveClipboardToHistory');

            // Expect graceful info message and no exception
            assert.ok(
                testContext.stubs.showInformationMessage.calledWith('No text selected. Select text in terminal or editor first.'),
                'Should inform user when no selection exists'
            );
        });
    });

    describe('Command Palette Integration', () => {
        it('Key commands are available in command palette', async () => {
            const commands = await vscode.commands.getCommands(true);

            assert.ok(commands.includes('gemini-cli-vscode.gemini.start.newPane'));
            assert.ok(commands.includes('gemini-cli-vscode.gemini.start.activePane'));
            assert.ok(commands.includes('gemini-cli-vscode.saveClipboardToHistory'));
            assert.ok(commands.includes('gemini-cli-vscode.gemini.send.selectedText'));
            assert.ok(commands.includes('gemini-cli-vscode.multiAI.openComposer'));
        });
    });
});
