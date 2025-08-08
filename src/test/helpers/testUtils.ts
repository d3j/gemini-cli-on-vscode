import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { MockTerminal, MockTextEditor, MockTextDocument, MockWorkspaceFolder } from '../mocks/vscode';

export interface TestContext {
    sandbox: sinon.SinonSandbox;
    stubs: {
        showInformationMessage: sinon.SinonStub;
        showWarningMessage: sinon.SinonStub;
        showErrorMessage: sinon.SinonStub;
        createTerminal: sinon.SinonStub;
        executeCommand: sinon.SinonStub;
        clipboardRead: sinon.SinonStub;
        clipboardWrite: sinon.SinonStub;
        asRelativePath: sinon.SinonStub;
    };
    mocks: {
        terminals: MockTerminal[];
        activeTerminal?: MockTerminal;
        activeTextEditor?: MockTextEditor;
        workspaceFolders?: MockWorkspaceFolder[];
    };
}

export function createTestContext(): TestContext {
    const sandbox = sinon.createSandbox();
    
    const stubs: any = {};
    
    // Only stub if not already stubbed
    if (!(vscode.window.showInformationMessage as any).isSinonProxy) {
        stubs.showInformationMessage = sandbox.stub(vscode.window, 'showInformationMessage');
    } else {
        stubs.showInformationMessage = vscode.window.showInformationMessage as any;
    }
    
    if (!(vscode.window.showWarningMessage as any).isSinonProxy) {
        stubs.showWarningMessage = sandbox.stub(vscode.window, 'showWarningMessage');
    } else {
        stubs.showWarningMessage = vscode.window.showWarningMessage as any;
    }
    
    if (!(vscode.window.showErrorMessage as any).isSinonProxy) {
        stubs.showErrorMessage = sandbox.stub(vscode.window, 'showErrorMessage');
    } else {
        stubs.showErrorMessage = vscode.window.showErrorMessage as any;
    }
    
    if (!(vscode.window.createTerminal as any).isSinonProxy) {
        stubs.createTerminal = sandbox.stub(vscode.window, 'createTerminal');
    } else {
        stubs.createTerminal = vscode.window.createTerminal as any;
    }
    
    if (!(vscode.commands.executeCommand as any).isSinonProxy) {
        stubs.executeCommand = sandbox.stub(vscode.commands, 'executeCommand');
    } else {
        stubs.executeCommand = vscode.commands.executeCommand as any;
    }
    
    // Clipboard stubs - handle environment differences properly
    try {
        if (vscode.env.clipboard && typeof vscode.env.clipboard.readText === 'function') {
            stubs.clipboardRead = sandbox.stub(vscode.env.clipboard, 'readText');
        } else {
            // Create a standalone stub if clipboard API is not available
            stubs.clipboardRead = sandbox.stub().resolves('');
            console.warn('Clipboard API not available, using standalone stub');
        }
    } catch (error) {
        // If stubbing fails, create a standalone stub but log the issue
        stubs.clipboardRead = sandbox.stub().resolves('');
        console.warn('Failed to stub clipboard.readText:', error);
    }
    
    try {
        if (vscode.env.clipboard && typeof vscode.env.clipboard.writeText === 'function') {
            stubs.clipboardWrite = sandbox.stub(vscode.env.clipboard, 'writeText');
        } else {
            // Create a standalone stub if clipboard API is not available
            stubs.clipboardWrite = sandbox.stub().resolves();
            console.warn('Clipboard API not available, using standalone stub');
        }
    } catch (error) {
        // If stubbing fails, create a standalone stub but log the issue
        stubs.clipboardWrite = sandbox.stub().resolves();
        console.warn('Failed to stub clipboard.writeText:', error);
    }
    
    if (!(vscode.workspace.asRelativePath as any).isSinonProxy) {
        stubs.asRelativePath = sandbox.stub(vscode.workspace, 'asRelativePath');
    } else {
        stubs.asRelativePath = vscode.workspace.asRelativePath as any;
    }
    
    const context: TestContext = {
        sandbox,
        stubs,
        mocks: {
            terminals: []
        }
    };
    
    if (stubs.asRelativePath && typeof stubs.asRelativePath.callsFake === 'function') {
        stubs.asRelativePath.callsFake((pathOrUri: string | vscode.Uri) => {
            const path = typeof pathOrUri === 'string' ? pathOrUri : pathOrUri.fsPath;
            return path.replace('/workspace/', '');
        });
    }
    
    return context;
}

export function cleanupTestContext(context: TestContext): void {
    context.sandbox.restore();
}

export function createMockTerminal(name: string = 'Gemini CLI'): MockTerminal {
    return new MockTerminal(name);
}

export function createMockEditor(content: string = '', selection?: vscode.Selection): MockTextEditor {
    const uri = vscode.Uri.file('/workspace/test.ts');
    const document = new MockTextDocument(uri, content);
    return new MockTextEditor(document as any, selection);
}

export function createMockWorkspaceFolder(path: string = '/workspace'): MockWorkspaceFolder {
    return new MockWorkspaceFolder(vscode.Uri.file(path));
}

export async function waitForCondition(
    condition: () => boolean,
    timeout: number = 1000,
    interval: number = 10
): Promise<void> {
    const startTime = Date.now();
    
    while (!condition()) {
        if (Date.now() - startTime > timeout) {
            throw new Error('Timeout waiting for condition');
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}

export async function waitForAsync(ms: number = 150): Promise<void> {
    // Helper for waiting for async operations with internal timeouts
    // Used when testing code that has setTimeout internally
    await new Promise(resolve => setTimeout(resolve, ms));
}

export function createMockUri(path: string): vscode.Uri {
    return vscode.Uri.file(path);
}

export function createMockSelection(
    startLine: number,
    startChar: number,
    endLine: number,
    endChar: number
): vscode.Selection {
    return new vscode.Selection(startLine, startChar, endLine, endChar);
}