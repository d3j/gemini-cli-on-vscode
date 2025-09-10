import * as assert from 'assert';
import { isWebviewToExtensionMessage, isExtensionToWebviewMessage } from '../../types/ipc';

describe('IPC type guards', () => {
    it('accepts known webview->extension commands', () => {
        assert.strictEqual(isWebviewToExtensionMessage({ command: 'templates/list' }), true);
        assert.strictEqual(isWebviewToExtensionMessage({ command: 'composer/insertTemplate' }), true);
        assert.strictEqual(isWebviewToExtensionMessage({ command: 'unknown/cmd' }), false);
    });
    it('accepts known extension->webview messages', () => {
        assert.strictEqual(isExtensionToWebviewMessage({ type: 'result', success: true }), true);
        assert.strictEqual(isExtensionToWebviewMessage({ type: 'terminalsUpdate', terminals: [] }), true);
        assert.strictEqual(isExtensionToWebviewMessage({ type: 'weird' }), false);
    });
});

