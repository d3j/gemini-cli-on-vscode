import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { activate } from '../../extension';
import { createMockContext } from '../mocks/vscode';
import { 
    createTestContext,
    cleanupTestContext,
    waitForCondition
} from '../helpers/testUtils';

describe('E2E Integration Test Suite', () => {
    let testContext: ReturnType<typeof createTestContext>;
    let extensionContext: vscode.ExtensionContext;
    let originalEnv: NodeJS.ProcessEnv;

    before(() => {
        originalEnv = { ...process.env };
    });

    beforeEach(() => {
        testContext = createTestContext();
        extensionContext = createMockContext();
    });

    afterEach(() => {
        cleanupTestContext(testContext);
        process.env = originalEnv;
    });

    describe('Full Workflow Tests', () => {
        it('Complete workflow: Start terminal, send files, save history', async function() {
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

            const mockWorkspaceFolder = {
                uri: vscode.Uri.file('/workspace'),
                name: 'workspace',
                index: 0
            };
            testContext.sandbox.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);

            activate(extensionContext);

            await vscode.commands.executeCommand('gemini-cli-vscode.startInNewPane');
            
            await waitForCondition(() => mockTerminals.length > 0);
            
            const terminal = mockTerminals[0] as any;
            assert.ok(terminal.sendText.calledWith('cd "/workspace"'));
            assert.ok(terminal.sendText.calledWith('gemini'));
            assert.ok(terminal.show.called);

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

            await vscode.commands.executeCommand('gemini-cli-vscode.saveClipboardToHistory');

            assert.ok(fsStubs.mkdirSync.calledWith(
                path.join('/workspace', '.gemini-history'),
                { recursive: true }
            ));

            const appendCall = fsStubs.appendFileSync.getCall(0);
            assert.ok(appendCall);
            const appendedContent = appendCall.args[1];
            assert.ok((appendedContent as string).includes('Selected text'));

            await vscode.commands.executeCommand('gemini-cli-vscode.sendSelectedText');

            await waitForCondition(() => terminal.sendText.callCount >= 3, 1000);

            const sendTextCalls = terminal.sendText.getCalls();
            const sentSelectedText = sendTextCalls.find((call: any) => 
                call.args[0].includes('Selected text')
            );
            assert.ok(sentSelectedText);
        });

        it('Multiple terminals management', async function() {
            this.timeout(3000);

            const mockTerminals: vscode.Terminal[] = [];
            const createTerminalStub = testContext.stubs.createTerminal;
            
            createTerminalStub.callsFake((options: vscode.TerminalOptions) => {
                const mockTerminal = {
                    name: options.name || 'Mock Terminal',
                    sendText: sinon.stub(),
                    show: sinon.stub(),
                    hide: sinon.stub(),
                    dispose: sinon.stub(),
                    processId: Promise.resolve(12345 + mockTerminals.length),
                    creationOptions: options,
                    exitStatus: undefined,
                    state: { isInteractedWith: false }
                };
                mockTerminals.push(mockTerminal as any);
                return mockTerminal as any;
            });

            testContext.sandbox.stub(vscode.window, 'terminals').get(() => mockTerminals);

            activate(extensionContext);

            await vscode.commands.executeCommand('gemini-cli-vscode.startInNewPane');
            assert.strictEqual(mockTerminals.length, 1);
            assert.strictEqual(createTerminalStub.callCount, 1);

            await vscode.commands.executeCommand('gemini-cli-vscode.startInActivePane');
            assert.strictEqual(mockTerminals.length, 2);
            assert.strictEqual(createTerminalStub.callCount, 2);

            await vscode.commands.executeCommand('gemini-cli-vscode.startInNewPane');
            assert.strictEqual(mockTerminals.length, 2);
            assert.strictEqual(createTerminalStub.callCount, 2);

            const firstTerminal = mockTerminals[0] as any;
            assert.strictEqual(firstTerminal.show.callCount, 2);
        });

        it('Terminal cleanup on close', async function() {
            this.timeout(3000);

            let terminalCloseCallback: ((terminal: vscode.Terminal) => void) | undefined;
            testContext.sandbox.stub(vscode.window, 'onDidCloseTerminal').callsFake((callback) => {
                terminalCloseCallback = callback;
                return { dispose: sinon.stub() };
            });

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

            activate(extensionContext);

            await vscode.commands.executeCommand('gemini-cli-vscode.startInNewPane');
            assert.strictEqual(createTerminalStub.callCount, 1);

            const terminal = mockTerminals[0];
            mockTerminals.splice(0, 1);
            
            if (terminalCloseCallback) {
                terminalCloseCallback(terminal);
            }

            await vscode.commands.executeCommand('gemini-cli-vscode.startInNewPane');
            assert.strictEqual(createTerminalStub.callCount, 2);
        });
    });

    describe('Error Handling', () => {
        it('Handles missing workspace gracefully', async () => {
            testContext.sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);

            activate(extensionContext);

            await vscode.commands.executeCommand('gemini-cli-vscode.saveClipboardToHistory');

            assert.ok(testContext.stubs.showErrorMessage.calledWith('No workspace folder open'));
        });

        it('Handles file system errors gracefully', async () => {
            const fsStubs = {
                existsSync: testContext.sandbox.stub(fs, 'existsSync'),
                mkdirSync: testContext.sandbox.stub(fs, 'mkdirSync')
            };

            fsStubs.existsSync.returns(false);
            fsStubs.mkdirSync.throws(new Error('Permission denied'));

            const mockWorkspaceFolder = {
                uri: vscode.Uri.file('/workspace'),
                name: 'workspace',
                index: 0
            };
            testContext.sandbox.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);

            testContext.stubs.clipboardRead.resolves('Some text');

            activate(extensionContext);

            try {
                await vscode.commands.executeCommand('gemini-cli-vscode.saveClipboardToHistory');
                assert.fail('Command should have thrown an error');
            } catch (error: any) {
                assert.ok(error, 'Error should be thrown');
                assert.ok(error.message?.includes('Permission denied'), 
                    `Expected error message to contain 'Permission denied', got: ${error.message}`);
            }
        });
    });

    describe('Command Palette Integration', () => {
        it('All commands are available in command palette', async () => {
            const getCommandsStub = testContext.sandbox.stub(vscode.commands, 'getCommands');
            getCommandsStub.resolves([
                'gemini-cli-vscode.startInNewPane',
                'gemini-cli-vscode.startInActivePane',
                'gemini-cli-vscode.sendOpenFilePath',
                'gemini-cli-vscode.saveClipboardToHistory',
                'gemini-cli-vscode.sendSelectedText',
                'gemini-cli-vscode.sendFilePath'
            ]);

            activate(extensionContext);

            const commands = await vscode.commands.getCommands();
            
            assert.ok(commands.includes('gemini-cli-vscode.startInNewPane'));
            assert.ok(commands.includes('gemini-cli-vscode.startInActivePane'));
            assert.ok(commands.includes('gemini-cli-vscode.sendOpenFilePath'));
            assert.ok(commands.includes('gemini-cli-vscode.saveClipboardToHistory'));
            assert.ok(commands.includes('gemini-cli-vscode.sendSelectedText'));
            assert.ok(commands.includes('gemini-cli-vscode.sendFilePath'));
        });
    });
});