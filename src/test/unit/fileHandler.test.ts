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

suite('FileHandler Unit Test Suite', () => {
    let fileHandler: FileHandler;
    let mockTerminals: Map<string, vscode.Terminal>;
    let testContext: ReturnType<typeof createTestContext>;

    setup(() => {
        testContext = createTestContext();
        mockTerminals = new Map<string, vscode.Terminal>();
        fileHandler = new FileHandler(mockTerminals);
    });

    teardown(() => {
        cleanupTestContext(testContext);
    });

    suite('formatFilePath', () => {
        test('should format path with @ prefix', () => {
            const uri = vscode.Uri.file('/workspace/test/file.txt');
            testContext.stubs.asRelativePath.returns('test/file.txt');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@test/file.txt');
        });

        test('should handle paths with spaces', () => {
            const uri = vscode.Uri.file('/workspace/test folder/my file.txt');
            testContext.stubs.asRelativePath.returns('test folder/my file.txt');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@"test folder/my file.txt"');
        });

        test('should handle Japanese characters in path', () => {
            const uri = vscode.Uri.file('/workspace/テスト/ファイル.txt');
            testContext.stubs.asRelativePath.returns('テスト/ファイル.txt');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@"テスト/ファイル.txt"');
        });

        test('should handle paths with mixed special characters', () => {
            const uri = vscode.Uri.file('/workspace/src/components/Button (legacy).tsx');
            testContext.stubs.asRelativePath.returns('src/components/Button (legacy).tsx');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@"src/components/Button (legacy).tsx"');
        });

        test('should not quote simple paths', () => {
            const uri = vscode.Uri.file('/workspace/src/index.ts');
            testContext.stubs.asRelativePath.returns('src/index.ts');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@src/index.ts');
        });

        test('should handle emoji in file paths', () => {
            const uri = vscode.Uri.file('/workspace/docs/📝notes.md');
            testContext.stubs.asRelativePath.returns('docs/📝notes.md');
            
            const formatted = fileHandler.formatFilePath(uri);
            
            assert.strictEqual(formatted, '@"docs/📝notes.md"');
        });
    });

    suite('findGeminiTerminal', () => {
        test('should return undefined when no terminals exist', () => {
            const terminals: vscode.Terminal[] = [];
            const terminal = fileHandler.findGeminiTerminal(terminals);
            assert.strictEqual(terminal, undefined);
        });

        test('should return undefined when no Gemini terminals in map', () => {
            const terminal1 = createMockTerminal('Other Terminal');
            const terminal2 = createMockTerminal('Another Terminal');
            const terminals = [terminal1, terminal2] as unknown as vscode.Terminal[];
            
            const terminal = fileHandler.findGeminiTerminal(terminals);
            
            assert.strictEqual(terminal, undefined);
        });

        test('should find Gemini terminal when it exists', () => {
            const geminiTerminal = createMockTerminal('Gemini CLI');
            const otherTerminal = createMockTerminal('Other Terminal');
            
            mockTerminals.set('newPane', geminiTerminal as unknown as vscode.Terminal);
            const terminals = [otherTerminal, geminiTerminal] as unknown as vscode.Terminal[];
            
            const terminal = fileHandler.findGeminiTerminal(terminals);
            
            assert.strictEqual(terminal, geminiTerminal);
        });

        test('should return first matching Gemini terminal', () => {
            const geminiTerminal1 = createMockTerminal('Gemini CLI');
            const geminiTerminal2 = createMockTerminal('Gemini CLI 2');
            
            mockTerminals.set('newPane', geminiTerminal1 as unknown as vscode.Terminal);
            mockTerminals.set('activePane', geminiTerminal2 as unknown as vscode.Terminal);
            const terminals = [geminiTerminal1, geminiTerminal2] as unknown as vscode.Terminal[];
            
            const terminal = fileHandler.findGeminiTerminal(terminals);
            
            assert.strictEqual(terminal, geminiTerminal1);
        });
    });

    suite('sendFilesToTerminal', () => {
        test('should send single file to terminal', async () => {
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

        test('should show warning when no terminal exists', async () => {
            testContext.sandbox.stub(vscode.window, 'terminals').value([]);
            
            const uri = createMockUri('/workspace/src/index.ts');
            
            await fileHandler.sendFilesToTerminal(uri);
            
            assert.ok(testContext.stubs.showWarningMessage.calledWith(
                'Gemini CLI is not running. Please start it first.'
            ));
        });
    });
});