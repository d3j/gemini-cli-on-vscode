import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileHandler } from '../../fileHandler';
import { 
    createTestContext,
    cleanupTestContext,
    createMockTerminal,
    createMockUri,
    waitForAsync
} from '../helpers/testUtils';

describe('FileHandler Unit Test Suite', () => {
    let fileHandler: FileHandler;
    let mockTerminals: Map<string, vscode.Terminal>;
    let testContext: ReturnType<typeof createTestContext>;

    beforeEach(() => {
        testContext = createTestContext();
        mockTerminals = new Map<string, vscode.Terminal>();
        fileHandler = new FileHandler(mockTerminals, new Map(), new Map(), new Map());
    });

    afterEach(() => {
        cleanupTestContext(testContext);
    });

    describe('formatFilePath', () => {
        it('should format path with @ prefix', () => {
            const uri = vscode.Uri.file('/workspace/test/file.txt');
            testContext.stubs.asRelativePath.returns('test/file.txt');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@test/file.txt');
        });

        it('should handle paths with spaces', () => {
            const uri = vscode.Uri.file('/workspace/test folder/my file.txt');
            testContext.stubs.asRelativePath.returns('test folder/my file.txt');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@"test folder/my file.txt"');
        });

        it('should handle Japanese characters in path', () => {
            const uri = vscode.Uri.file('/workspace/テスト/ファイル.txt');
            testContext.stubs.asRelativePath.returns('テスト/ファイル.txt');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@"テスト/ファイル.txt"');
        });

        it('should handle paths with mixed special characters', () => {
            const uri = vscode.Uri.file('/workspace/src/components/Button (legacy).tsx');
            testContext.stubs.asRelativePath.returns('src/components/Button (legacy).tsx');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@"src/components/Button (legacy).tsx"');
        });

        it('should not quote simple paths', () => {
            const uri = vscode.Uri.file('/workspace/src/index.ts');
            testContext.stubs.asRelativePath.returns('src/index.ts');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@src/index.ts');
        });

        it('should handle emoji in file paths', () => {
            const uri = vscode.Uri.file('/workspace/docs/📝notes.md');
            testContext.stubs.asRelativePath.returns('docs/📝notes.md');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@"docs/📝notes.md"');
        });
    });

    describe('findCLITerminal', () => {
        it('should return undefined when no terminals exist', () => {
            const terminals: vscode.Terminal[] = [];
            const terminal = fileHandler.findCLITerminal(terminals);
            assert.strictEqual(terminal, undefined);
        });

        it('should return undefined when no CLI terminals in map', () => {
            const terminal1 = createMockTerminal('Other Terminal');
            const terminal2 = createMockTerminal('Another Terminal');
            const terminals = [terminal1, terminal2] as unknown as vscode.Terminal[];
            
            const terminal = fileHandler.findCLITerminal(terminals);
            
            assert.strictEqual(terminal, undefined);
        });

        it('should find CLI terminal when it exists', () => {
            const cliTerminal = createMockTerminal('Gemini CLI');
            const otherTerminal = createMockTerminal('Other Terminal');
            
            mockTerminals.set('newPane', cliTerminal as unknown as vscode.Terminal);
            const terminals = [otherTerminal, cliTerminal] as unknown as vscode.Terminal[];
            
            const terminal = fileHandler.findCLITerminal(terminals);
            
            assert.strictEqual(terminal, cliTerminal);
        });

        it('should return first matching CLI terminal', () => {
            const cliTerminal1 = createMockTerminal('Gemini CLI');
            const cliTerminal2 = createMockTerminal('Codex CLI');
            
            mockTerminals.set('newPane', cliTerminal1 as unknown as vscode.Terminal);
            mockTerminals.set('activePane', cliTerminal2 as unknown as vscode.Terminal);
            const terminals = [cliTerminal1, cliTerminal2] as unknown as vscode.Terminal[];
            
            const terminal = fileHandler.findCLITerminal(terminals);
            
            assert.strictEqual(terminal, cliTerminal1);
        });
    });

    describe('sendFilesToTerminal', () => {
        it('should send single file to terminal', async () => {
            const geminiTerminal = createMockTerminal();
            mockTerminals.set('newPane', geminiTerminal as unknown as vscode.Terminal);
            testContext.sandbox.stub(vscode.window, 'terminals').value([geminiTerminal]);
            
            const uri = createMockUri('/workspace/src/index.ts');
            testContext.stubs.asRelativePath.returns('src/index.ts');
            
            await fileHandler.sendFilesToTerminal(uri);
            
            // Wait for the internal timeout in fileHandler to complete
            await waitForAsync();
            
            assert.ok(geminiTerminal.sendText.calledWith('@src/index.ts ', false));
            assert.ok(geminiTerminal.show.called);
            assert.ok(testContext.stubs.showInformationMessage.calledWith('Sent 1 item to Gemini CLI'));
        });

        it('should show warning when no terminal exists', async () => {
            testContext.sandbox.stub(vscode.window, 'terminals').value([]);
            
            const uri = createMockUri('/workspace/src/index.ts');
            
            await fileHandler.sendFilesToTerminal(uri);
            
            assert.ok(testContext.stubs.showWarningMessage.calledWith(
                'No CLI is running. Please start Gemini, Codex, or Claude CLI first.'
            ));
        });

        it('should send multiple files to terminal', async () => {
            const geminiTerminal = createMockTerminal();
            mockTerminals.set('activePane', geminiTerminal as unknown as vscode.Terminal);
            testContext.sandbox.stub(vscode.window, 'terminals').value([geminiTerminal]);

            const uris = [
                createMockUri('/workspace/src/index.ts'),
                createMockUri('/workspace/src/app.ts'),
                createMockUri('/workspace/src/utils.ts')
            ];

            testContext.stubs.asRelativePath.onCall(0).returns('src/index.ts');
            testContext.stubs.asRelativePath.onCall(1).returns('src/app.ts');
            testContext.stubs.asRelativePath.onCall(2).returns('src/utils.ts');

            await fileHandler.sendFilesToTerminal(uris);

            await waitForAsync();

            assert.ok(geminiTerminal.sendText.calledWith('@src/index.ts @src/app.ts @src/utils.ts ', false));
            assert.ok(geminiTerminal.show.called);
            assert.ok(testContext.stubs.showInformationMessage.calledWith('Sent 3 items to Gemini CLI'));
        });

        it('should handle files with spaces in names', async () => {
            const geminiTerminal = createMockTerminal();
            mockTerminals.set('newPane', geminiTerminal as unknown as vscode.Terminal);
            testContext.sandbox.stub(vscode.window, 'terminals').value([geminiTerminal]);

            const uris = [
                createMockUri('/workspace/my docs/readme.md'),
                createMockUri('/workspace/test files/test.spec.ts')
            ];

            testContext.stubs.asRelativePath.onCall(0).returns('my docs/readme.md');
            testContext.stubs.asRelativePath.onCall(1).returns('test files/test.spec.ts');

            await fileHandler.sendFilesToTerminal(uris);

            await waitForAsync();

            assert.ok(geminiTerminal.sendText.calledWith('@"my docs/readme.md" @"test files/test.spec.ts" ', false));
        });

        it('should handle mixed file types', async () => {
            const geminiTerminal = createMockTerminal();
            mockTerminals.set('newPane', geminiTerminal as unknown as vscode.Terminal);
            testContext.sandbox.stub(vscode.window, 'terminals').value([geminiTerminal]);

            const uris = [
                createMockUri('/workspace/README.md'),
                createMockUri('/workspace/src/index.ts'),
                createMockUri('/workspace/package.json'),
                createMockUri('/workspace/.gitignore')
            ];

            testContext.stubs.asRelativePath.onCall(0).returns('README.md');
            testContext.stubs.asRelativePath.onCall(1).returns('src/index.ts');
            testContext.stubs.asRelativePath.onCall(2).returns('package.json');
            testContext.stubs.asRelativePath.onCall(3).returns('.gitignore');

            await fileHandler.sendFilesToTerminal(uris);

            await waitForAsync();

            assert.ok(geminiTerminal.sendText.calledWith(
                '@README.md @src/index.ts @package.json @.gitignore ', 
                false
            ));
        });
    });

    describe('Terminal Map Regression Tests', () => {
        it('should find terminal in map even if not in vscode.window.terminals', () => {
            // デグレケース: ターミナルがマップにあるが、vscode.window.terminalsにない
            const geminiTerminal = createMockTerminal('Gemini CLI');
            const codexTerminal = createMockTerminal('Codex CLI');
            
            // geminiTerminalsに追加
            const geminiMap = new Map<string, vscode.Terminal>();
            geminiMap.set('gemini-global', geminiTerminal as unknown as vscode.Terminal);
            
            // codexTerminalsに追加
            const codexMap = new Map<string, vscode.Terminal>();
            codexMap.set('codex-global', codexTerminal as unknown as vscode.Terminal);
            
            // FileHandlerを作成
            const handler = new FileHandler(geminiMap, codexMap, new Map(), new Map());
            
            // vscode.window.terminalsは空（作成直後の状態を再現）
            const emptyTerminalsList: vscode.Terminal[] = [];
            
            // Act
            const foundGemini = handler.findCLITerminal(emptyTerminalsList, 'gemini');
            const foundCodex = handler.findCLITerminal(emptyTerminalsList, 'codex');
            
            // Assert - マップ内のターミナルが見つかるべき
            assert.strictEqual(foundGemini, geminiTerminal, 
                'Should find Gemini terminal in map even if not in terminals list');
            assert.strictEqual(foundCodex, codexTerminal, 
                'Should find Codex terminal in map even if not in terminals list');
        });

        it('should not return disposed terminals from map', () => {
            // 終了したターミナルをマップに追加
            const disposedTerminal = createMockTerminal('Gemini CLI');
            (disposedTerminal as any).exitStatus = { code: 0 }; // ターミナルが終了している
            
            const geminiMap = new Map<string, vscode.Terminal>();
            geminiMap.set('gemini-global', disposedTerminal as unknown as vscode.Terminal);
            
            const handler = new FileHandler(geminiMap, new Map(), new Map(), new Map());
            
            // Act
            const found = handler.findCLITerminal([], 'gemini');
            
            // Assert - 終了したターミナルは返さない
            assert.strictEqual(found, undefined, 
                'Should not return disposed terminal');
        });

        it('should prioritize Claude -> Codex -> Gemini when no target specified', () => {
            const claudeTerminal = createMockTerminal('Claude CLI');
            const codexTerminal = createMockTerminal('Codex CLI');
            const geminiTerminal = createMockTerminal('Gemini CLI');
            
            const claudeMap = new Map<string, vscode.Terminal>();
            claudeMap.set('claude-global', claudeTerminal as unknown as vscode.Terminal);
            
            const codexMap = new Map<string, vscode.Terminal>();
            codexMap.set('codex-global', codexTerminal as unknown as vscode.Terminal);
            
            const geminiMap = new Map<string, vscode.Terminal>();
            geminiMap.set('gemini-global', geminiTerminal as unknown as vscode.Terminal);
            
            const handler = new FileHandler(geminiMap, codexMap, claudeMap, new Map());
            
            // Act - targetCLIを指定しない
            const found = handler.findCLITerminal([]);
            
            // Assert - Claudeが優先される
            assert.strictEqual(found, claudeTerminal, 
                'Should return Claude terminal due to priority');
        });
    });
});
