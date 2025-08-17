import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { MigrationHandler } from '../../migrationHandler';

describe('MigrationHandler', () => {
    describe('Configuration Fallback', () => {
        it('should provide fallback for deprecated delay settings', () => {
            const claudeDelay = MigrationHandler.getConfigWithFallback('composer.delays.claude.enter', 0);
            assert.strictEqual(claudeDelay, 150);
            
            const geminiDelay = MigrationHandler.getConfigWithFallback('composer.delays.gemini.enter', 0);
            assert.strictEqual(geminiDelay, 600);
        });
        
        it('should return default for non-deprecated settings', () => {
            const value = MigrationHandler.getConfigWithFallback('some.other.setting', 'default');
            assert.strictEqual(value, 'default');
        });
    });
    
describe('Migration Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: any;
    let mockConfig: any;
    let handler: MigrationHandler;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Mock context with globalState
        mockContext = {
            globalState: {
                get: sandbox.stub(),
                update: sandbox.stub().resolves()
            }
        };
        
        // Mock configuration
        mockConfig = {
            get: sandbox.stub(),
            inspect: sandbox.stub(),
            update: sandbox.stub().resolves()
        };
        
        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        handler = new MigrationHandler();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('New Installation', () => {
        it('should detect new installation and set Qwen enabled to true', async () => {
            // New installation - no firstRun flag
            mockContext.globalState.get.withArgs('gemini-cli-vscode.firstRun').returns(undefined);
            
            // No existing qwen.enabled setting
            mockConfig.inspect.withArgs('qwen.enabled').returns({
                key: 'qwen.enabled',
                defaultValue: false,
                globalValue: undefined,
                workspaceValue: undefined
            });
            
            await handler.migrate(mockContext);
            
            // Should set firstRun flag
            assert(mockContext.globalState.update.calledWith('gemini-cli-vscode.firstRun', true));
            
            // Should set qwen.enabled to true
            assert(mockConfig.update.calledWith('qwen.enabled', true, vscode.ConfigurationTarget.Global));
        });

        it('should not override existing qwen.enabled setting on new installation', async () => {
            // New installation but user already has qwen.enabled set
            mockContext.globalState.get.withArgs('gemini-cli-vscode.firstRun').returns(undefined);
            
            mockConfig.inspect.withArgs('qwen.enabled').returns({
                key: 'qwen.enabled',
                defaultValue: false,
                globalValue: false,  // User has explicitly set it
                workspaceValue: undefined
            });
            
            await handler.migrate(mockContext);
            
            // Should set firstRun flag
            assert(mockContext.globalState.update.calledWith('gemini-cli-vscode.firstRun', true));
            
            // Should NOT update qwen.enabled
            assert(!mockConfig.update.calledWith('qwen.enabled', true, vscode.ConfigurationTarget.Global));
        });
    });

    describe('Existing Installation', () => {
        it('should preserve existing user settings', async () => {
            // Existing installation - has firstRun flag
            mockContext.globalState.get.withArgs('gemini-cli-vscode.firstRun').returns(true);
            
            // User has custom settings
            mockConfig.get.withArgs('magusCouncil.composer.delays.claude.enter').returns(200);
            mockConfig.get.withArgs('magusCouncil.composer.delays.gemini.enter').returns(800);
            
            await handler.migrate(mockContext);
            
            // Should NOT update firstRun flag again
            assert(mockContext.globalState.update.neverCalledWith('gemini-cli-vscode.firstRun'));
            
            // Should NOT write deprecated settings anymore
            assert(mockConfig.update.neverCalledWith('magusCouncil.composer.delays.claude.enter'));
            assert(mockConfig.update.neverCalledWith('magusCouncil.composer.delays.gemini.enter'));
        });

        it('should NOT write defaults for missing deprecated settings', async () => {
            // Existing installation
            mockContext.globalState.get.withArgs('gemini-cli-vscode.firstRun').returns(true);
            
            // No deprecated settings exist
            mockConfig.get.withArgs('magusCouncil.composer.delays.claude.enter').returns(undefined);
            mockConfig.get.withArgs('magusCouncil.composer.delays.gemini.enter').returns(undefined);
            
            await handler.migrate(mockContext);
            
            // Should NOT write default values (use read-time fallback instead)
            assert(mockConfig.update.neverCalledWith('magusCouncil.composer.delays.claude.enter'));
            assert(mockConfig.update.neverCalledWith('magusCouncil.composer.delays.gemini.enter'));
        });
    });

    describe('Workspace vs Global Settings', () => {
        it('should respect workspace-level qwen.enabled setting', async () => {
            // New installation
            mockContext.globalState.get.withArgs('gemini-cli-vscode.firstRun').returns(undefined);
            
            mockConfig.inspect.withArgs('qwen.enabled').returns({
                key: 'qwen.enabled',
                defaultValue: false,
                globalValue: undefined,
                workspaceValue: true  // Workspace setting exists
            });
            
            await handler.migrate(mockContext);
            
            // Should NOT update qwen.enabled when workspace value exists
            assert(mockConfig.update.neverCalledWith('qwen.enabled'));
        });
    });
});
});