import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { CommandHandler } from '../../core/CommandHandler';
import { ConfigService } from '../../core/ConfigService';
import { TerminalManager } from '../../core/TerminalManager';
import { Logger } from '../../core/Logger';
import { FileHandler } from '../../fileHandler';
import { HistoryService } from '../../core/HistoryService';
import { PromptComposerViewProvider } from '../../multiAI/promptComposerView';
import { createMockContext } from '../mocks/vscode';

describe('CommandHandler - sendSelectedToMAGUSCouncil', () => {
    let sandbox: sinon.SinonSandbox;
    let commandHandler: CommandHandler;
    let mockProvider: sinon.SinonStubbedInstance<PromptComposerViewProvider>;
    let executeCommandStub: sinon.SinonStub;
    let showWarningMessageStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    let showInformationMessageStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Create mock dependencies
        const mockContext = createMockContext();
        const mockConfigService = sandbox.createStubInstance(ConfigService);
        const mockTerminalManager = sandbox.createStubInstance(TerminalManager);
        const mockLogger = sandbox.createStubInstance(Logger);
        const mockFileHandler = sandbox.createStubInstance(FileHandler);
        const mockHistoryService = sandbox.createStubInstance(HistoryService);
        
        // Create CommandHandler instance
        commandHandler = new CommandHandler(
            mockContext as any,
            mockConfigService as any,
            mockTerminalManager as any,
            mockLogger as any,
            mockFileHandler as any,
            mockHistoryService as any
        );
        
        // Create mock PromptComposerViewProvider
        mockProvider = sandbox.createStubInstance(PromptComposerViewProvider);
        mockProvider.setPromptText = sandbox.stub().resolves() as any;
        
        // Stub VS Code APIs
        executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();
        showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage');
        showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
        showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('No active editor', () => {
        it('should show warning when no active editor', async () => {
            sandbox.stub(vscode.window, 'activeTextEditor').value(undefined);
            
            await commandHandler.sendSelectedToMAGUSCouncil();
            
            assert(showWarningMessageStub.calledWith('No active editor'));
            assert(executeCommandStub.notCalled);
        });
    });

    describe('Empty document', () => {
        it('should show warning when document is empty', async () => {
            const mockEditor = {
                selection: { isEmpty: true },
                document: { getText: () => '' }
            };
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            
            await commandHandler.sendSelectedToMAGUSCouncil();
            
            assert(showWarningMessageStub.calledWith('No text selected or document is empty'));
            assert(executeCommandStub.notCalled);
        });
    });

    describe('Text selection', () => {
        it('should use selected text when selection exists', async () => {
            const selectedText = 'Hello World';
            const mockEditor = {
                selection: { isEmpty: false },
                document: { 
                    getText: (selection?: any) => selection ? selectedText : 'Full document'
                }
            };
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            commandHandler.setPromptComposerViewProvider(mockProvider as any);
            
            await commandHandler.sendSelectedToMAGUSCouncil();
            
            assert(executeCommandStub.calledWith('gemini-cli-vscode.multiAI.openComposer'));
            assert(mockProvider.setPromptText.calledWith(selectedText));
        });

        it('should use full document when no selection', async () => {
            const fullText = 'Full document content';
            const mockEditor = {
                selection: { isEmpty: true },
                document: { getText: () => fullText }
            };
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            commandHandler.setPromptComposerViewProvider(mockProvider as any);
            
            await commandHandler.sendSelectedToMAGUSCouncil();
            
            assert(executeCommandStub.calledWith('gemini-cli-vscode.multiAI.openComposer'));
            assert(mockProvider.setPromptText.calledWith(fullText));
        });
    });

    describe('Large text warning', () => {
        it('should warn for text over 100KB and allow continuation', async () => {
            const largeText = 'x'.repeat(150 * 1024); // 150KB
            const mockEditor = {
                selection: { isEmpty: false },
                document: { getText: () => largeText }
            };
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            showWarningMessageStub.resolves('Continue');
            commandHandler.setPromptComposerViewProvider(mockProvider as any);
            
            await commandHandler.sendSelectedToMAGUSCouncil();
            
            assert(showWarningMessageStub.calledWith(
                sinon.match(/Selected text is \d+KB/),
                'Continue', 'Cancel'
            ));
            assert(executeCommandStub.calledWith('gemini-cli-vscode.multiAI.openComposer'));
            assert(mockProvider.setPromptText.calledWith(largeText));
        });

        it('should cancel when user chooses Cancel for large text', async () => {
            const largeText = 'x'.repeat(150 * 1024); // 150KB
            const mockEditor = {
                selection: { isEmpty: false },
                document: { getText: () => largeText }
            };
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            showWarningMessageStub.resolves('Cancel');
            
            await commandHandler.sendSelectedToMAGUSCouncil();
            
            assert(showWarningMessageStub.called);
            assert(executeCommandStub.notCalled);
        });
    });

    describe('Provider fallback', () => {
        it('should show info message when provider is not set', async () => {
            const text = 'Test content';
            const mockEditor = {
                selection: { isEmpty: false },
                document: { getText: () => text }
            };
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            sandbox.stub(vscode.env.clipboard, 'writeText').resolves();
            // Provider not set
            
            await commandHandler.sendSelectedToMAGUSCouncil();
            
            assert(executeCommandStub.calledWith('gemini-cli-vscode.multiAI.openComposer'));
            // Can't directly test clipboard in VS Code test environment
            assert(showInformationMessageStub.calledWith(
                'MAGUS Council is initializing. Text copied to clipboard - please paste it into the composer.'
            ));
        });
    });

    describe('Error handling', () => {
        it('should handle openComposer command failure', async () => {
            const text = 'Test content';
            const mockEditor = {
                selection: { isEmpty: false },
                document: { getText: () => text }
            };
            sandbox.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            executeCommandStub.rejects(new Error('Command failed'));
            
            await commandHandler.sendSelectedToMAGUSCouncil();
            
            assert(showErrorMessageStub.calledWith('Failed to open MAGUS Council'));
        });
    });
});