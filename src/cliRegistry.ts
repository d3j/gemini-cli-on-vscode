import { CLIType } from './types';
import * as vscode from 'vscode';

interface CLIConfig {
    id: CLIType;
    name: string;
    command: string;  // 設定可能
    args?: string[];  // 設定可能
    icon: string;
    enabled: boolean;
}

export class CLIRegistry {
    private configs: Map<CLIType, CLIConfig> = new Map();
    private disposables: vscode.Disposable[] = [];
    
    constructor() {
        this.loadConfigs();
        this.watchConfigChanges();
    }
    
    private loadConfigs(): void {
        const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
        
        // Helper function to get command with fallback for empty strings
        const getCommand = (key: string, defaultValue: string): string => {
            const value = config.get<string>(key, defaultValue);
            return value && value.trim() !== '' ? value : defaultValue;
        };
        
        this.configs = new Map([
            ['gemini', {
                id: 'gemini',
                name: 'Gemini CLI',
                command: getCommand('gemini.command', 'gemini'),
                args: config.get('gemini.args', []),
                icon: 'icon.png',
                enabled: config.get('gemini.enabled', true)
            }],
            ['codex', {
                id: 'codex',
                name: 'Codex CLI',
                command: getCommand('codex.command', 'codex'),
                args: config.get('codex.args', []),
                icon: 'codex-icon.png',
                enabled: config.get('codex.enabled', true)
            }],
            ['claude', {
                id: 'claude',
                name: 'Claude Code',
                command: getCommand('claude.command', 'claude'),
                args: config.get('claude.args', []),
                icon: 'claude-logo.png',
                enabled: config.get('claude.enabled', true)
            }],
            ['qwen', {
                id: 'qwen',
                name: 'Qwen CLI',
                command: getCommand('qwen.command', 'qwen'),
                args: config.get('qwen.args', []),
                icon: 'qwen-color.svg',
                enabled: config.get('qwen.enabled', false) // デフォルト無効
            }]
        ]);
    }
    
    private watchConfigChanges(): void {
        const watcher = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('gemini-cli-vscode')) {
                this.loadConfigs();
                vscode.window.showInformationMessage('CLI configurations reloaded');
            }
        });
        this.disposables.push(watcher);
    }
    
    getCLI(type: CLIType): CLIConfig | undefined {
        return this.configs.get(type);
    }
    
    getAllEnabled(): CLIConfig[] {
        return Array.from(this.configs.values()).filter(c => c.enabled);
    }
    
    getCommand(type: CLIType): string {
        const cli = this.getCLI(type);
        if (!cli) return '';
        
        // コマンドと引数を結合
        return cli.args && cli.args.length > 0
            ? `${cli.command} ${cli.args.join(' ')}`
            : cli.command;
    }
    
    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
