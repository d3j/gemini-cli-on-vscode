import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileHandler } from '../fileHandler';

suite('FileHandler Test Suite', () => {
    let fileHandler: FileHandler;
    let mockTerminals: Map<string, vscode.Terminal>;

    setup(() => {
        mockTerminals = new Map<string, vscode.Terminal>();
        fileHandler = new FileHandler(mockTerminals);
    });

    suite('formatFilePath', () => {
        test('should format path with @ prefix', () => {
            const uri = vscode.Uri.file('/workspace/test/file.txt');
            const formatted = fileHandler.formatFilePath(uri);
            // Note: In tests, vscode.workspace.asRelativePath returns the full path
            // when there's no workspace folder, so we check if @ prefix is added
            assert.ok(formatted.startsWith('@'));
        });

        test('should handle paths with spaces', () => {
            const uri = vscode.Uri.file('/workspace/test folder/my file.txt');
            const formatted = fileHandler.formatFilePath(uri);
            // Should be quoted when path contains spaces
            assert.ok(formatted.startsWith('@"'));
            assert.ok(formatted.endsWith('"'));
        });

        test('should handle Japanese characters in path', () => {
            const uri = vscode.Uri.file('/workspace/テスト/ファイル.txt');
            const formatted = fileHandler.formatFilePath(uri);
            // Should be quoted when path contains non-ASCII characters
            assert.ok(formatted.startsWith('@"'));
            assert.ok(formatted.endsWith('"'));
        });
    });

    suite('findGeminiTerminal', () => {
        test('should return undefined when no terminals exist', () => {
            const terminals: vscode.Terminal[] = [];
            const terminal = fileHandler.findGeminiTerminal(terminals);
            assert.strictEqual(terminal, undefined);
        });
    });
});