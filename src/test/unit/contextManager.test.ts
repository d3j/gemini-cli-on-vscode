import * as assert from 'assert';
import { ContextManager } from '../../multiAI/contextManager';

describe('ContextManager Unit Tests', () => {
    let contextManager: ContextManager;

    beforeEach(() => {
        contextManager = new ContextManager();
    });

    describe('addFile', () => {
        it('should add a file to context items', () => {
            contextManager.addFile('/path/to/file.ts', 'file content');
            const items = contextManager.getContextItems();
            
            assert.strictEqual(items.length, 1);
            assert.strictEqual(items[0].type, 'file');
            assert.strictEqual(items[0].path, '/path/to/file.ts');
            assert.strictEqual(items[0].content, 'file content');
        });

        it('should add file without content', () => {
            contextManager.addFile('/path/to/file.ts');
            const items = contextManager.getContextItems();
            
            assert.strictEqual(items.length, 1);
            assert.strictEqual(items[0].type, 'file');
            assert.strictEqual(items[0].path, '/path/to/file.ts');
            assert.strictEqual(items[0].content, undefined);
        });
    });

    describe('addText', () => {
        it('should add text to context items', () => {
            contextManager.addText('Some context text');
            const items = contextManager.getContextItems();
            
            assert.strictEqual(items.length, 1);
            assert.strictEqual(items[0].type, 'text');
            assert.strictEqual(items[0].content, 'Some context text');
        });
    });

    describe('clear', () => {
        it('should clear all context items', () => {
            contextManager.addFile('/path/to/file.ts');
            contextManager.addText('Some text');
            
            assert.strictEqual(contextManager.getContextItems().length, 2);
            
            contextManager.clear();
            
            assert.strictEqual(contextManager.getContextItems().length, 0);
        });
    });

    describe('buildContext', () => {
        it('should build context string from items', async () => {
            contextManager.addFile('/path/to/file.ts', 'console.log("hello");');
            contextManager.addText('Additional context');
            
            const context = await contextManager.buildContext();
            
            assert(context);
            assert(context.includes('File: /path/to/file.ts'));
            assert(context.includes('console.log("hello");'));
            assert(context.includes('Additional context'));
        });

        it('should return undefined for empty context', async () => {
            const context = await contextManager.buildContext();
            assert.strictEqual(context, undefined);
        });
    });

    describe('formatForPrompt', () => {
        it('should format context for prompt', async () => {
            contextManager.addText('Test context');
            const formatted = await contextManager.formatForPrompt();
            
            assert(formatted);
            assert(formatted.includes('Test context'));
        });

        it('should return empty string for no context', async () => {
            const formatted = await contextManager.formatForPrompt();
            assert.strictEqual(formatted, '');
        });
    });
});