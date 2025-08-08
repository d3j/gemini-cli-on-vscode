import * as sinon from 'sinon';
import * as vscode from 'vscode';

export class MockTerminal implements vscode.Terminal {
    name: string;
    processId: Thenable<number | undefined>;
    creationOptions: Readonly<vscode.TerminalOptions | vscode.ExtensionTerminalOptions>;
    exitStatus: vscode.TerminalExitStatus | undefined;
    state: vscode.TerminalState;
    shellIntegration: vscode.TerminalShellIntegration | undefined;
    
    sendText = sinon.stub();
    show = sinon.stub();
    hide = sinon.stub();
    dispose = sinon.stub();
    
    constructor(name: string = 'Mock Terminal') {
        this.name = name;
        this.processId = Promise.resolve(12345);
        this.creationOptions = { name };
        this.exitStatus = undefined;
        this.state = { isInteractedWith: false, shell: undefined } as vscode.TerminalState;
        this.shellIntegration = undefined;
    }
}

export class MockTextEditor implements Partial<vscode.TextEditor> {
    document: vscode.TextDocument;
    selection: vscode.Selection;
    selections: readonly vscode.Selection[];
    
    constructor(document: vscode.TextDocument, selection?: vscode.Selection) {
        this.document = document;
        this.selection = selection || new vscode.Selection(0, 0, 0, 0);
        this.selections = [this.selection];
    }
}

export class MockTextDocument implements Partial<vscode.TextDocument> {
    uri: vscode.Uri;
    fileName: string;
    isUntitled: boolean;
    languageId: string;
    version: number;
    isDirty: boolean;
    isClosed: boolean;
    eol: vscode.EndOfLine;
    lineCount: number;
    
    private content: string;
    
    constructor(uri: vscode.Uri, content: string = '') {
        this.uri = uri;
        this.fileName = uri.fsPath;
        this.isUntitled = false;
        this.languageId = 'typescript';
        this.version = 1;
        this.isDirty = false;
        this.isClosed = false;
        this.eol = vscode.EndOfLine.LF;
        this.content = content;
        this.lineCount = content.split('\n').length;
    }
    
    getText(range?: vscode.Range): string {
        if (!range) {
            return this.content;
        }
        const lines = this.content.split('\n');
        if (range.start.line === range.end.line) {
            return lines[range.start.line].substring(range.start.character, range.end.character);
        }
        const result: string[] = [];
        for (let i = range.start.line; i <= range.end.line; i++) {
            if (i === range.start.line) {
                result.push(lines[i].substring(range.start.character));
            } else if (i === range.end.line) {
                result.push(lines[i].substring(0, range.end.character));
            } else {
                result.push(lines[i]);
            }
        }
        return result.join('\n');
    }
    
    lineAt(line: number | vscode.Position): vscode.TextLine {
        const lineNumber = typeof line === 'number' ? line : line.line;
        const lines = this.content.split('\n');
        const text = lines[lineNumber] || '';
        return {
            lineNumber: lineNumber,
            text,
            range: new vscode.Range(lineNumber, 0, lineNumber, text.length),
            rangeIncludingLineBreak: new vscode.Range(lineNumber, 0, lineNumber + 1, 0),
            firstNonWhitespaceCharacterIndex: text.search(/\S/),
            isEmptyOrWhitespace: text.trim().length === 0
        };
    }
}

export class MockStatusBarItem implements vscode.StatusBarItem {
    id: string;
    alignment: vscode.StatusBarAlignment;
    priority: number;
    name: string;
    text: string;
    tooltip: string | vscode.MarkdownString | undefined;
    color: string | vscode.ThemeColor | undefined;
    backgroundColor: vscode.ThemeColor | undefined;
    command: string | vscode.Command | undefined;
    accessibilityInformation: vscode.AccessibilityInformation | undefined;
    
    show = sinon.stub();
    hide = sinon.stub();
    dispose = sinon.stub();
    
    constructor(alignment: vscode.StatusBarAlignment = vscode.StatusBarAlignment.Left, priority?: number) {
        this.id = 'mock-status-bar-item';
        this.alignment = alignment;
        this.priority = priority || 0;
        this.name = 'Mock Status Bar Item';
        this.text = '';
        this.tooltip = undefined;
        this.color = undefined;
        this.backgroundColor = undefined;
        this.command = undefined;
        this.accessibilityInformation = undefined;
    }
}

export class MockWorkspaceFolder implements vscode.WorkspaceFolder {
    uri: vscode.Uri;
    name: string;
    index: number;
    
    constructor(uri: vscode.Uri, name?: string, index: number = 0) {
        this.uri = uri;
        this.name = name || uri.fsPath.split('/').pop() || 'workspace';
        this.index = index;
    }
}

export class MockTabGroup implements Partial<vscode.TabGroup> {
    isActive: boolean;
    viewColumn: vscode.ViewColumn;
    activeTab: vscode.Tab | undefined;
    tabs: readonly vscode.Tab[];
    
    constructor(tabs: vscode.Tab[] = [], isActive: boolean = false) {
        this.tabs = tabs;
        this.isActive = isActive;
        this.viewColumn = vscode.ViewColumn.One;
        this.activeTab = tabs[0];
    }
}

export class MockTab implements Partial<vscode.Tab> {
    label: string;
    group: vscode.TabGroup;
    input: any;
    isActive: boolean;
    isDirty: boolean;
    isPinned: boolean;
    isPreview: boolean;
    
    constructor(input: any, label: string = 'Mock Tab') {
        this.label = label;
        this.input = input;
        this.isActive = false;
        this.isDirty = false;
        this.isPinned = false;
        this.isPreview = false;
        this.group = new MockTabGroup([]) as any;
    }
}

export class MockTabInputText implements vscode.TabInputText {
    uri: vscode.Uri;
    
    constructor(uri: vscode.Uri) {
        this.uri = uri;
    }
}

export function createMockContext(): vscode.ExtensionContext {
    const context: Partial<vscode.ExtensionContext> = {
        subscriptions: [],
        extensionUri: vscode.Uri.file('/mock/extension'),
        extensionPath: '/mock/extension',
        globalState: {
            keys: () => [],
            get: sinon.stub(),
            update: sinon.stub().resolves(),
            setKeysForSync: sinon.stub()
        } as any,
        workspaceState: {
            keys: () => [],
            get: sinon.stub(),
            update: sinon.stub().resolves()
        } as any,
        secrets: {
            get: sinon.stub().resolves(),
            store: sinon.stub().resolves(),
            delete: sinon.stub().resolves(),
            onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
        } as any,
        asAbsolutePath: (relativePath: string) => `/mock/extension/${relativePath}`,
        storagePath: '/mock/storage',
        globalStoragePath: '/mock/global-storage',
        logPath: '/mock/logs',
        extensionMode: vscode.ExtensionMode.Test,
        storageUri: vscode.Uri.file('/mock/storage'),
        globalStorageUri: vscode.Uri.file('/mock/global-storage'),
        logUri: vscode.Uri.file('/mock/logs')
    };
    
    return context as vscode.ExtensionContext;
}