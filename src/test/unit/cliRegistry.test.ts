import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { CLIRegistry } from '../../cliRegistry';
import { CLIType } from '../../types';

describe('CLIRegistry', () => {
    let registry: CLIRegistry;
    let configStub: sinon.SinonStub;
    let mockConfiguration: any;

    beforeEach(() => {
        mockConfiguration = {
            get: sinon.stub()
        };
        
        // デフォルト設定値を返す
        mockConfiguration.get.withArgs('gemini.command', 'gemini').returns('gemini');
        mockConfiguration.get.withArgs('gemini.args', []).returns([]);
        mockConfiguration.get.withArgs('gemini.enabled', true).returns(true);
        
        mockConfiguration.get.withArgs('codex.command', 'codex').returns('codex');
        mockConfiguration.get.withArgs('codex.args', []).returns([]);
        mockConfiguration.get.withArgs('codex.enabled', true).returns(true);
        
        mockConfiguration.get.withArgs('claude.command', 'claude').returns('claude');
        mockConfiguration.get.withArgs('claude.args', []).returns([]);
        mockConfiguration.get.withArgs('claude.enabled', true).returns(true);
        
        mockConfiguration.get.withArgs('qwen.command', 'qwen').returns('qwen');
        mockConfiguration.get.withArgs('qwen.args', []).returns([]);
        mockConfiguration.get.withArgs('qwen.enabled', false).returns(false); // デフォルト無効
        
        configStub = sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfiguration);
        
        registry = new CLIRegistry();
    });

    afterEach(() => {
        configStub.restore();
        registry.dispose();
    });

    describe('getCLI', () => {
        it('should return Gemini CLI config', () => {
            const cli = registry.getCLI('gemini');
            assert.strictEqual(cli?.id, 'gemini');
            assert.strictEqual(cli?.name, 'Gemini CLI');
            assert.strictEqual(cli?.command, 'gemini');
            assert.strictEqual(cli?.enabled, true);
        });

        it('should return Codex CLI config', () => {
            const cli = registry.getCLI('codex');
            assert.strictEqual(cli?.id, 'codex');
            assert.strictEqual(cli?.name, 'Codex CLI');
            assert.strictEqual(cli?.command, 'codex');
            assert.strictEqual(cli?.enabled, true);
        });

        it('should return Claude CLI config', () => {
            const cli = registry.getCLI('claude');
            assert.strictEqual(cli?.id, 'claude');
            assert.strictEqual(cli?.name, 'Claude Code');
            assert.strictEqual(cli?.command, 'claude');
            assert.strictEqual(cli?.enabled, true);
        });

        it('should return Qwen CLI config with disabled by default', () => {
            const cli = registry.getCLI('qwen');
            assert.strictEqual(cli?.id, 'qwen');
            assert.strictEqual(cli?.name, 'Qwen CLI');
            assert.strictEqual(cli?.command, 'qwen');
            assert.strictEqual(cli?.enabled, false); // デフォルト無効
        });

        it('should return undefined for unknown CLI type', () => {
            const cli = registry.getCLI('unknown' as CLIType);
            assert.strictEqual(cli, undefined);
        });
    });

    describe('getAllEnabled', () => {
        it('should return only enabled CLIs by default', () => {
            const enabled = registry.getAllEnabled();
            assert.strictEqual(enabled.length, 3); // Gemini, Codex, Claude (Qwenは無効)
            assert.ok(enabled.some(c => c.id === 'gemini'));
            assert.ok(enabled.some(c => c.id === 'codex'));
            assert.ok(enabled.some(c => c.id === 'claude'));
            assert.ok(!enabled.some(c => c.id === 'qwen'));
        });

        it('should include Qwen when enabled', () => {
            // Qwenを有効化
            mockConfiguration.get.withArgs('qwen.enabled', false).returns(true);
            registry = new CLIRegistry();
            
            const enabled = registry.getAllEnabled();
            assert.strictEqual(enabled.length, 4);
            assert.ok(enabled.some(c => c.id === 'qwen'));
        });
    });

    describe('getCommand', () => {
        it('should return command without args when args is empty', () => {
            const command = registry.getCommand('gemini');
            assert.strictEqual(command, 'gemini');
        });

        it('should return command with args when args are provided', () => {
            mockConfiguration.get.withArgs('gemini.args', []).returns(['--model', 'gpt-4']);
            registry = new CLIRegistry();
            
            const command = registry.getCommand('gemini');
            assert.strictEqual(command, 'gemini --model gpt-4');
        });

        it('should return empty string for unknown CLI', () => {
            const command = registry.getCommand('unknown' as CLIType);
            assert.strictEqual(command, '');
        });

        it('should handle Ollama-style command for Qwen', () => {
            mockConfiguration.get.withArgs('qwen.command', 'qwen').returns('ollama');
            mockConfiguration.get.withArgs('qwen.args', []).returns(['run', 'qwen2.5-coder:32b']);
            registry = new CLIRegistry();
            
            const command = registry.getCommand('qwen');
            assert.strictEqual(command, 'ollama run qwen2.5-coder:32b');
        });
    });

    describe('configuration reload', () => {
        it('should reload configs when configuration changes', async () => {
            const disposableStub = { dispose: sinon.stub() };
            const onDidChangeConfigStub = sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns(disposableStub);
            
            // 新しいレジストリを作成して、設定変更イベントをキャプチャ
            registry.dispose();
            registry = new CLIRegistry();
            
            // 設定が変更されたことをシミュレート
            mockConfiguration.get.withArgs('qwen.enabled', false).returns(true);
            
            // loadConfigsを呼び出して新しい設定を反映
            (registry as any).loadConfigs();
            
            const cli = registry.getCLI('qwen');
            assert.strictEqual(cli?.enabled, true);
            
            onDidChangeConfigStub.restore();
        });
    });

    describe('dispose', () => {
        it('should dispose all disposables', () => {
            const disposeSpy = sinon.spy();
            const disposable = { dispose: disposeSpy };
            (registry as any).disposables = [disposable];
            
            registry.dispose();
            
            assert.ok(disposeSpy.calledOnce);
        });
    });
});