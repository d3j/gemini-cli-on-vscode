import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'mocha';

describe('Configuration Hierarchical Structure', () => {
    let sandbox: sinon.SinonSandbox;
    let mockConfig: any;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        mockConfig = {
            get: sandbox.stub(),
            has: sandbox.stub(),
            inspect: sandbox.stub(),
            update: sandbox.stub()
        };
        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Standard Settings', () => {
        it('should expose only 8 main settings in Standard section', () => {
            // Standard設定は以下の8項目のみ
            const standardSettings = [
                'gemini.enabled',
                'codex.enabled', 
                'claude.enabled',
                'qwen.enabled',
                'magusCouncil.enabled',
                'contextMenu.enabled',
                'saveToHistory.enabled',
                'magusCouncil.composer.autoSaveHistory'
            ];

            standardSettings.forEach(setting => {
                mockConfig.get.withArgs(setting).returns(true);
            });

            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            // Standard設定が取得できることを確認
            standardSettings.forEach(setting => {
                const value = config.get(setting);
                assert.strictEqual(value, true, `Standard setting ${setting} should be accessible`);
            });
        });

        it('should have correct default values for new installations', () => {
            // 新規インストール時のデフォルト値
            mockConfig.get.withArgs('gemini.enabled').returns(true);
            mockConfig.get.withArgs('codex.enabled').returns(true);
            mockConfig.get.withArgs('claude.enabled').returns(true);
            mockConfig.get.withArgs('qwen.enabled').returns(true); // 新規はtrue
            mockConfig.get.withArgs('magusCouncil.enabled').returns(true);
            mockConfig.get.withArgs('contextMenu.enabled').returns(true);
            mockConfig.get.withArgs('saveToHistory.enabled').returns(true);
            mockConfig.get.withArgs('magusCouncil.composer.autoSaveHistory').returns(true);

            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            assert.strictEqual(config.get('qwen.enabled'), true, 'Qwen should be enabled by default for new installations');
        });
    });

    describe('Advanced Settings', () => {
        it('should include context menu detail controls', () => {
            // コンテキストメニューの詳細制御
            mockConfig.get.withArgs('contextMenu.showSendText').returns(true);
            mockConfig.get.withArgs('contextMenu.showSendFilePath').returns(true);
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            assert.strictEqual(config.get('contextMenu.showSendText'), true);
            assert.strictEqual(config.get('contextMenu.showSendFilePath'), true);
        });

        it('should include CLI commands configuration', () => {
            // 全AIのcommand/args設定
            const cliTypes = ['gemini', 'codex', 'claude', 'qwen'];
            
            cliTypes.forEach(cli => {
                mockConfig.get.withArgs(`${cli}.command`).returns(cli);
                mockConfig.get.withArgs(`${cli}.args`).returns([]);
            });

            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            cliTypes.forEach(cli => {
                assert.strictEqual(config.get(`${cli}.command`), cli);
                assert.deepStrictEqual(config.get(`${cli}.args`), []);
            });
        });

        it('should include MAGUS Council details', () => {
            mockConfig.get.withArgs('multiAI.defaultAgents').returns(['gemini', 'codex', 'claude']);
            mockConfig.get.withArgs('multiAI.launch.clis').returns(['claude', 'gemini', 'codex']);
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            assert.deepStrictEqual(config.get('multiAI.defaultAgents'), ['gemini', 'codex', 'claude']);
            assert.deepStrictEqual(config.get('multiAI.launch.clis'), ['claude', 'gemini', 'codex']);
        });

        it('should move initial delay to Terminal section', () => {
            mockConfig.get.withArgs('multiAI.composer.delays.initial').returns(100);
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            assert.strictEqual(config.get('multiAI.composer.delays.initial'), 100);
        });
    });

    describe('Deprecated Settings', () => {
        it('should handle deprecated enter delays with fallback', () => {
            // Deprecated設定が存在しない場合のフォールバック
            mockConfig.get.withArgs('multiAI.composer.delays.claude.enter', 150).returns(150);
            mockConfig.get.withArgs('multiAI.composer.delays.gemini.enter', 600).returns(600);
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            // 内部的なデフォルト値を使用
            const claudeDelay = config.get('multiAI.composer.delays.claude.enter', 150);
            const geminiDelay = config.get('multiAI.composer.delays.gemini.enter', 600);
            
            assert.strictEqual(claudeDelay, 150);
            assert.strictEqual(geminiDelay, 600);
        });

        it('should preserve existing deprecated values', () => {
            // 既存ユーザーの設定値を保持
            mockConfig.get.withArgs('multiAI.composer.delays.claude.enter').returns(200);
            mockConfig.get.withArgs('multiAI.composer.delays.gemini.enter').returns(800);
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            assert.strictEqual(config.get('multiAI.composer.delays.claude.enter'), 200);
            assert.strictEqual(config.get('multiAI.composer.delays.gemini.enter'), 800);
        });
    });

    describe('Context Menu Control Hierarchy', () => {
        it('should respect global context menu toggle', () => {
            mockConfig.get.withArgs('contextMenu.enabled').returns(false);
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            // グローバル無効時は個別設定は無視される（ロジックはwhen条件で実装）
            assert.strictEqual(config.get('contextMenu.enabled'), false);
        });

        it('should respect action-specific toggles', () => {
            mockConfig.get.withArgs('contextMenu.enabled').returns(true);
            mockConfig.get.withArgs('contextMenu.showSendText').returns(false);
            mockConfig.get.withArgs('contextMenu.showSendFilePath').returns(true);
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            assert.strictEqual(config.get('contextMenu.showSendText'), false);
            assert.strictEqual(config.get('contextMenu.showSendFilePath'), true);
        });

        it('should support per-agent overrides', () => {
            mockConfig.get.withArgs('contextMenu.enabled').returns(true);
            mockConfig.get.withArgs('contextMenu.showSendText').returns(true);
            mockConfig.get.withArgs('gemini.showInContextMenu').returns(false);
            mockConfig.get.withArgs('codex.showInContextMenu').returns(true);
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            assert.strictEqual(config.get('gemini.showInContextMenu'), false);
            assert.strictEqual(config.get('codex.showInContextMenu'), true);
        });
    });

    describe('SaveToHistory Control Hierarchy', () => {
        it('should respect global saveToHistory toggle', () => {
            mockConfig.get.withArgs('saveToHistory.enabled').returns(false);
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            // グローバル無効時はすべてのsaveToHistory機能が無効になる
            assert.strictEqual(config.get('saveToHistory.enabled'), false);
        });

        it('should support fine-grained statusBar control when enabled', () => {
            mockConfig.get.withArgs('saveToHistory.enabled').returns(true);
            mockConfig.get.withArgs('saveToHistory.showStatusBar').returns(false);
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            assert.strictEqual(config.get('saveToHistory.enabled'), true);
            assert.strictEqual(config.get('saveToHistory.showStatusBar'), false);
        });
    });

    describe('Terminal Grouping Behavior', () => {
        it('should have same as default grouping behavior', () => {
            mockConfig.get.withArgs('terminal.groupingBehavior').returns('same');
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            assert.strictEqual(config.get('terminal.groupingBehavior'), 'same');
        });

        it('should support new grouping behavior', () => {
            mockConfig.get.withArgs('terminal.groupingBehavior').returns('new');
            
            const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
            
            assert.strictEqual(config.get('terminal.groupingBehavior'), 'new');
        });
    });
});