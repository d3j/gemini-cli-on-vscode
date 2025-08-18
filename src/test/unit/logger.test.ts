import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { Logger } from '../../core/Logger';

describe('Logger', () => {
    let logger: Logger;
    let sandbox: sinon.SinonSandbox;
    let outputChannel: vscode.OutputChannel;
    let appendLineStub: sinon.SinonStub;
    let showStub: sinon.SinonStub;
    let clearStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Mock OutputChannel
        appendLineStub = sandbox.stub();
        showStub = sandbox.stub();
        clearStub = sandbox.stub();
        
        outputChannel = {
            appendLine: appendLineStub,
            append: sandbox.stub(),
            clear: clearStub,
            show: showStub,
            hide: sandbox.stub(),
            dispose: sandbox.stub(),
            name: 'Gemini CLI on VSCode',
            replace: sandbox.stub()
        } as any;
        
        // Mock vscode.window.createOutputChannel
        sandbox.stub(vscode.window, 'createOutputChannel').returns(outputChannel as any);
        
        logger = new Logger();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Initialization', () => {
        it('should create output channel with correct name', () => {
            assert.strictEqual(outputChannel.name, 'Gemini CLI on VSCode');
        });
    });

    describe('Log levels', () => {
        let clock: sinon.SinonFakeTimers;

        beforeEach(() => {
            // Use fake timers to control timestamps
            clock = sandbox.useFakeTimers(new Date('2025-01-18T12:00:00Z'));
        });

        afterEach(() => {
            clock.restore();
        });

        it('should log info messages with timestamp', () => {
            logger.info('Test info message');
            
            assert.strictEqual(appendLineStub.calledOnce, true);
            const message = appendLineStub.firstCall.args[0];
            assert.ok(message.includes('[INFO]'));
            assert.ok(message.includes('Test info message'));
            assert.ok(message.includes('2025-01-18T12:00:00'));
        });

        it('should log warning messages with timestamp', () => {
            logger.warn('Test warning message');
            
            assert.strictEqual(appendLineStub.calledOnce, true);
            const message = appendLineStub.firstCall.args[0];
            assert.ok(message.includes('[WARN]'));
            assert.ok(message.includes('Test warning message'));
            assert.ok(message.includes('2025-01-18T12:00:00'));
        });

        it('should log error messages with timestamp', () => {
            logger.error('Test error message');
            
            assert.strictEqual(appendLineStub.calledOnce, true);
            const message = appendLineStub.firstCall.args[0];
            assert.ok(message.includes('[ERROR]'));
            assert.ok(message.includes('Test error message'));
            assert.ok(message.includes('2025-01-18T12:00:00'));
        });

        it('should log debug messages with timestamp', () => {
            logger.debug('Test debug message');
            
            assert.strictEqual(appendLineStub.calledOnce, true);
            const message = appendLineStub.firstCall.args[0];
            assert.ok(message.includes('[DEBUG]'));
            assert.ok(message.includes('Test debug message'));
            assert.ok(message.includes('2025-01-18T12:00:00'));
        });
    });

    describe('Log with additional data', () => {
        it('should log message with object data', () => {
            logger.info('User action', { action: 'sendFile', cli: 'gemini' });
            
            assert.strictEqual(appendLineStub.calledOnce, true);
            const message = appendLineStub.firstCall.args[0];
            assert.ok(message.includes('User action'));
            assert.ok(message.includes('"action":"sendFile"'));
            assert.ok(message.includes('"cli":"gemini"'));
        });

        it('should handle error objects', () => {
            const error = new Error('Something went wrong');
            logger.error('Operation failed', error);
            
            assert.strictEqual(appendLineStub.calledOnce, true);
            const message = appendLineStub.firstCall.args[0];
            assert.ok(message.includes('Operation failed'));
            assert.ok(message.includes('Something went wrong'));
        });

        it('should handle null and undefined data', () => {
            logger.info('Message with null', null);
            logger.info('Message with undefined', undefined);
            
            assert.strictEqual(appendLineStub.calledTwice, true);
        });
    });

    describe('Output channel management', () => {
        it('should show output channel', () => {
            logger.show();
            
            assert.strictEqual(showStub.calledOnce, true);
            assert.strictEqual(showStub.calledWith(true), true);
        });

        it('should clear output channel', () => {
            logger.clear();
            
            assert.strictEqual(clearStub.calledOnce, true);
        });
    });

    describe('Log events', () => {
        it('should log activation event', () => {
            logger.logActivation('0.2.0');
            
            assert.strictEqual(appendLineStub.calledOnce, true);
            const message = appendLineStub.firstCall.args[0];
            assert.ok(message.includes('Extension activated'));
            assert.ok(message.includes('"version":"0.2.0"'));
        });

        it('should log terminal creation', () => {
            logger.logTerminalCreation('gemini', 'Gemini CLI');
            
            assert.strictEqual(appendLineStub.calledOnce, true);
            const message = appendLineStub.firstCall.args[0];
            assert.ok(message.includes('Terminal created'));
            assert.ok(message.includes('gemini'));
            assert.ok(message.includes('Gemini CLI'));
        });

        it('should log command execution', () => {
            logger.logCommandExecution('sendFilePathToGemini', { fileCount: 3 });
            
            assert.strictEqual(appendLineStub.calledOnce, true);
            const message = appendLineStub.firstCall.args[0];
            assert.ok(message.includes('Command executed'));
            assert.ok(message.includes('sendFilePathToGemini'));
            assert.ok(message.includes('fileCount'));
        });

        it('should log configuration change', () => {
            logger.logConfigChange('gemini.enabled', true, false);
            
            assert.strictEqual(appendLineStub.calledOnce, true);
            const message = appendLineStub.firstCall.args[0];
            assert.ok(message.includes('Configuration changed'));
            assert.ok(message.includes('gemini.enabled'));
            assert.ok(message.includes('true'));
            assert.ok(message.includes('false'));
        });
    });

    describe('Performance logging', () => {
        it('should measure and log performance', async () => {
            const endTimer = logger.startTimer('test-operation');
            
            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, 100));
            
            endTimer();
            
            assert.strictEqual(appendLineStub.calledTwice, true);
            
            // Check start message
            const startMessage = appendLineStub.firstCall.args[0];
            assert.ok(startMessage.includes('test-operation started'));
            
            // Check end message
            const endMessage = appendLineStub.secondCall.args[0];
            assert.ok(endMessage.includes('test-operation completed'));
            assert.ok(endMessage.includes('ms'));
        });
    });

    describe('Disposal', () => {
        it('should dispose output channel', () => {
            const disposeStub = outputChannel.dispose as sinon.SinonStub;
            
            logger.dispose();
            
            assert.strictEqual(disposeStub.calledOnce, true);
        });
    });
});