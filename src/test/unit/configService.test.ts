import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ConfigService } from '../../core/ConfigService';

describe('ConfigService', () => {
    let configService: ConfigService;
    let sandbox: sinon.SinonSandbox;
    let mockConfig: Map<string, any>;
    let configStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        mockConfig = new Map();
        
        // Mock vscode.workspace.getConfiguration
        configStub = sandbox.stub(vscode.workspace, 'getConfiguration');
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const fullKey = `gemini-cli-vscode.${key}`;
                return mockConfig.has(fullKey) ? mockConfig.get(fullKey) : defaultValue;
            },
            inspect: (key: string) => {
                const fullKey = `gemini-cli-vscode.${key}`;
                const value = mockConfig.get(fullKey);
                return {
                    key: fullKey,
                    defaultValue: undefined,
                    globalValue: value,
                    workspaceValue: undefined,
                    workspaceFolderValue: undefined,
                    defaultLanguageValue: undefined,
                    globalLanguageValue: undefined,
                    workspaceLanguageValue: undefined,
                    workspaceFolderLanguageValue: undefined,
                    languageIds: undefined
                };
            },
            has: (key: string) => {
                const fullKey = `gemini-cli-vscode.${key}`;
                return mockConfig.has(fullKey);
            },
            update: async (key: string, value: any) => {
                const fullKey = `gemini-cli-vscode.${key}`;
                mockConfig.set(fullKey, value);
            }
        });

        configService = new ConfigService();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Type-safe configuration access', () => {
        it('should get config with type safety', () => {
            mockConfig.set('gemini-cli-vscode.magusCouncil.enabled', true);
            
            const enabled = configService.get('magusCouncil.enabled', false);
            assert.strictEqual(typeof enabled, 'boolean');
            assert.strictEqual(enabled, true);
        });

        it('should return default value when config is not set', () => {
            // Test with a key that doesn't have a preset default value
            const customSetting = configService.get('custom.nonexistent.setting', 'defaultValue');
            assert.strictEqual(customSetting, 'defaultValue');
        });
    });

    describe('Configuration fallback (new > old > default)', () => {
        it('should prefer new key over old key', () => {
            mockConfig.set('gemini-cli-vscode.magusCouncil.enabled', true);
            mockConfig.set('gemini-cli-vscode.multiAI.enabled', false);
            
            const enabled = configService.get('magusCouncil.enabled', false);
            assert.strictEqual(enabled, true);
        });

        it('should fallback to old key when new key is not set', () => {
            // Only old key exists
            mockConfig.set('gemini-cli-vscode.multiAI.enabled', true);
            
            const enabled = configService.get('magusCouncil.enabled', false);
            assert.strictEqual(enabled, true);
        });

        it('should use default when neither new nor old key exists', () => {
            const enabled = configService.get('magusCouncil.enabled', true);
            assert.strictEqual(enabled, true);
        });

        it('should handle nested configuration fallback', () => {
            mockConfig.set('gemini-cli-vscode.multiAI.composer.autoSaveHistory', false);
            
            const autoSave = configService.get('magusCouncil.composer.autoSaveHistory', true);
            assert.strictEqual(autoSave, false);
        });
    });

    describe('Configuration observation', () => {
        it('should observe configuration changes', (done) => {
            const callback = sinon.stub();
            const disposable = configService.observe(['magusCouncil.enabled'], callback);
            
            // Simulate configuration change event
            const changeEvent = {
                affectsConfiguration: (section: string) => section === 'gemini-cli-vscode.magusCouncil.enabled'
            } as vscode.ConfigurationChangeEvent;
            
            // Trigger the change event
            configService['handleConfigChange'](changeEvent);
            
            // Verify callback was called
            setTimeout(() => {
                assert.strictEqual(callback.calledOnce, true);
                disposable.dispose();
                done();
            }, 10);
        });

        it('should not trigger callback for unrelated configuration changes', (done) => {
            const callback = sinon.stub();
            const disposable = configService.observe(['magusCouncil.enabled'], callback);
            
            // Simulate unrelated configuration change
            const changeEvent = {
                affectsConfiguration: (section: string) => section === 'editor.fontSize'
            } as vscode.ConfigurationChangeEvent;
            
            configService['handleConfigChange'](changeEvent);
            
            setTimeout(() => {
                assert.strictEqual(callback.called, false);
                disposable.dispose();
                done();
            }, 10);
        });
    });

    describe('CLI-specific delay configuration', () => {
        it('should get Claude delay with dynamic calculation', () => {
            const delay = configService.getCliDelay('claude', 2500);
            assert.strictEqual(delay, 2500); // Long text delay
        });

        it('should get Gemini delay from config', () => {
            mockConfig.set('gemini-cli-vscode.magusCouncil.composer.delays.gemini.enter', 600);
            const delay = configService.getCliDelay('gemini', 100);
            assert.strictEqual(delay, 600);
        });

        it('should get default delay for other CLIs', () => {
            const delay = configService.getCliDelay('codex', 100);
            assert.strictEqual(delay, 100);
        });
    });

    describe('Inspect configuration', () => {
        it('should inspect configuration values at different scopes', () => {
            mockConfig.set('gemini-cli-vscode.magusCouncil.enabled', true);
            
            const result = configService.inspect('magusCouncil.enabled');
            assert.strictEqual(result?.globalValue, true);
            assert.strictEqual(result?.workspaceValue, undefined);
        });
    });

    describe('Disposal', () => {
        it('should dispose all resources properly', () => {
            const callback = sinon.stub();
            configService.observe(['magusCouncil.enabled'], callback);
            
            configService.dispose();
            
            // Try to trigger change after disposal
            const changeEvent = {
                affectsConfiguration: (section: string) => section === 'gemini-cli-vscode.magusCouncil.enabled'
            } as vscode.ConfigurationChangeEvent;
            
            configService['handleConfigChange'](changeEvent);
            
            // Callback should not be called after disposal
            assert.strictEqual(callback.called, false);
        });
    });
});