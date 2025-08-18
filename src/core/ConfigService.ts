import * as vscode from 'vscode';
import { CLIType } from '../types';

/**
 * Configuration key mapping for fallback support
 */
const CONFIG_KEY_MAPPING: Record<string, string> = {
    'magusCouncil.enabled': 'multiAI.enabled',
    'magusCouncil.defaultAgents': 'multiAI.defaultAgents',
    'magusCouncil.launch.clis': 'multiAI.launch.clis',
    'magusCouncil.composer.autoSaveHistory': 'multiAI.composer.autoSaveHistory',
    'magusCouncil.composer.delays.initial': 'multiAI.composer.delays.initial',
    'magusCouncil.composer.delays.claude.enter': 'multiAI.composer.delays.claude.enter',
    'magusCouncil.composer.delays.gemini.enter': 'multiAI.composer.delays.gemini.enter'
};

/**
 * Default configuration values
 */
const DEFAULT_VALUES: Record<string, any> = {
    // MAGUS Council settings
    'magusCouncil.enabled': true,
    'magusCouncil.defaultAgents': ['gemini', 'codex', 'claude'],
    'magusCouncil.launch.clis': [],
    'magusCouncil.composer.autoSaveHistory': true,
    'magusCouncil.composer.delays.initial': 100,
    'magusCouncil.composer.delays.claude.enter': 150,
    'magusCouncil.composer.delays.gemini.enter': 600,
    
    // Deprecated delay settings (for backward compatibility)
    'composer.delays.claude.enter': 150,
    'composer.delays.gemini.enter': 600,
    'multiAI.composer.delays.claude.enter': 150,
    'multiAI.composer.delays.gemini.enter': 600,
    
    // CLI settings
    'gemini.enabled': true,
    'gemini.command': 'gemini',
    'gemini.args': [],
    'codex.enabled': true,
    'codex.command': 'codex',
    'codex.args': [],
    'claude.enabled': true,
    'claude.command': 'claude',
    'claude.args': [],
    'qwen.enabled': false,
    'qwen.command': 'qwen',
    'qwen.args': [],
    
    // Other settings
    'saveToHistory.enabled': true,
    'saveToHistory.includeTerminalName': false
};

/**
 * Service for managing VS Code extension configuration with type safety and fallback support
 */
export class ConfigService {
    private readonly configSection = 'gemini-cli-vscode';
    private disposables: vscode.Disposable[] = [];
    private observers: Map<string, Set<() => void>> = new Map();
    
    constructor() {
        // Register configuration change listener
        const configListener = vscode.workspace.onDidChangeConfiguration(e => {
            this.handleConfigChange(e);
        });
        this.disposables.push(configListener);
    }
    
    /**
     * Get configuration value with type safety and fallback support
     * Priority: new key > old key > default value
     */
    get<T>(key: string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration(this.configSection);
        
        // Try to get with new key
        const value = config.get<T>(key);
        if (value !== undefined) {
            return value;
        }
        
        // Try fallback to old key
        const oldKey = CONFIG_KEY_MAPPING[key];
        if (oldKey) {
            const oldValue = config.get<T>(oldKey);
            if (oldValue !== undefined) {
                return oldValue;
            }
        }
        
        // Use predefined default if available
        const presetDefault = DEFAULT_VALUES[key];
        if (presetDefault !== undefined) {
            return presetDefault as T;
        }
        
        // Use provided default value
        return defaultValue;
    }
    
    /**
     * Inspect configuration value at different scopes
     */
    inspect(key: string): vscode.WorkspaceConfiguration['inspect'] extends (section: string) => infer R ? R : never {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.inspect(key);
    }
    
    /**
     * Update configuration value
     */
    async update(key: string, value: any, target?: vscode.ConfigurationTarget): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update(key, value, target);
    }
    
    /**
     * Observe configuration changes for specific keys
     */
    observe(keys: string[], callback: () => void): vscode.Disposable {
        // Store observer
        keys.forEach(key => {
            if (!this.observers.has(key)) {
                this.observers.set(key, new Set());
            }
            this.observers.get(key)!.add(callback);
        });
        
        // Return disposable to unregister observer
        return new vscode.Disposable(() => {
            keys.forEach(key => {
                this.observers.get(key)?.delete(callback);
            });
        });
    }
    
    /**
     * Get CLI-specific delay with dynamic calculation for Claude
     */
    getCliDelay(cli: CLIType, textLength: number): number {
        switch (cli) {
            case 'claude': {
                // Dynamic delay for Claude based on text length
                if (textLength > 2000) {
                    return 2500; // 2.5 seconds for long text
                } else if (textLength > 1000) {
                    return 1500; // 1.5 seconds for medium text
                } else {
                    return this.get('magusCouncil.composer.delays.claude.enter', 150);
                }
            }
            case 'gemini': {
                return this.get('magusCouncil.composer.delays.gemini.enter', 600);
            }
            case 'codex':
            case 'qwen':
            default: {
                return 100; // Default delay for other CLIs
            }
        }
    }
    
    /**
     * Handle configuration change events
     */
    private handleConfigChange(e: vscode.ConfigurationChangeEvent): void {
        // Check each observed key
        this.observers.forEach((callbacks, key) => {
            const fullKey = `${this.configSection}.${key}`;
            if (e.affectsConfiguration(fullKey)) {
                // Also check if old key changed (for fallback)
                const oldKey = CONFIG_KEY_MAPPING[key];
                const oldFullKey = oldKey ? `${this.configSection}.${oldKey}` : null;
                
                if (e.affectsConfiguration(fullKey) || (oldFullKey && e.affectsConfiguration(oldFullKey))) {
                    callbacks.forEach(callback => callback());
                }
            }
        });
    }
    
    /**
     * Get all enabled CLI configurations
     */
    getEnabledCLIs(): CLIType[] {
        const clis: CLIType[] = ['gemini', 'codex', 'claude', 'qwen'];
        return clis.filter(cli => this.get(`${cli}.enabled`, false));
    }
    
    /**
     * Check if a specific feature is enabled
     */
    isFeatureEnabled(feature: string): boolean {
        switch (feature) {
            case 'magusCouncil':
                return this.get('magusCouncil.enabled', true);
            case 'saveToHistory':
                return this.get('saveToHistory.enabled', true);
            default:
                return false;
        }
    }
    
    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.observers.clear();
    }
}