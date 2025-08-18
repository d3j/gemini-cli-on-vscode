import * as vscode from 'vscode';
import { ConfigService } from './core/ConfigService';

export class MigrationHandler {
    private readonly FIRST_RUN_KEY = 'gemini-cli-vscode.firstRun';
    private configService: ConfigService;
    
    constructor(configService?: ConfigService) {
        this.configService = configService || new ConfigService();
        // Keep reference for future use in migration methods
        void this.configService; // Acknowledge configService is stored for future use
    }
    
    /**
     * Get configuration value with fallback for deprecated settings
     * This is used for read-time fallback without writing to config
     * @deprecated Use ConfigService.get() instead
     */
    public static getConfigWithFallback<T>(key: string, defaultValue: T): T {
        const tempConfigService = new ConfigService();
        const result = tempConfigService.get(key, defaultValue);
        tempConfigService.dispose();
        return result;
    }
    
    async migrate(context: vscode.ExtensionContext): Promise<void> {
        const isFirstRun = !context.globalState.get(this.FIRST_RUN_KEY);
        
        if (isFirstRun) {
            // New installation: Set Qwen to enabled by default
            await this.setDefaultForNewUser('qwen.enabled', true);
            await context.globalState.update(this.FIRST_RUN_KEY, true);
        } else {
            // Existing user: Preserve settings
            await this.migrateDeprecatedSettings();
        }
        
        // Migrate multiAI settings to magusCouncil
        await this.migrateMultiAISettings();
    }
    
    private async setDefaultForNewUser(key: string, value: any): Promise<void> {
        const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
        const existingValue = config.inspect(key);
        
        // Only set if no user/workspace value exists
        if (existingValue?.workspaceValue === undefined && existingValue?.globalValue === undefined) {
            await config.update(key, value, vscode.ConfigurationTarget.Global);
        }
    }
    
    private async migrateDeprecatedSettings(): Promise<void> {
        // No longer write deprecated settings to config
        // These will be handled with read-time fallback instead
        // This method is kept for future use but currently does nothing
    }
    
    private async migrateMultiAISettings(): Promise<void> {
        const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
        
        // List of settings to copy from multiAI to magusCouncil
        const settingsToMigrate = [
            'enabled',
            'defaultAgents',
            'launch.clis',
            'composer.autoSaveHistory',
            'composer.delays.initial',
            'composer.delays.claude.enter',
            'composer.delays.gemini.enter'
        ];
        
        // Track migration for logging
        const migratedSettings: string[] = [];
        
        for (const setting of settingsToMigrate) {
            const oldKey = `multiAI.${setting}`;
            const newKey = `magusCouncil.${setting}`;
            
            // Check if old setting exists
            const oldValue = config.inspect(oldKey);
            if (oldValue?.globalValue !== undefined || oldValue?.workspaceValue !== undefined) {
                const value = oldValue.workspaceValue ?? oldValue.globalValue;
                
                // Check if new setting doesn't exist
                const newValue = config.inspect(newKey);
                if (newValue?.globalValue === undefined && newValue?.workspaceValue === undefined) {
                    // Copy to new key (DO NOT delete old key for backward compatibility)
                    const target = oldValue.workspaceValue !== undefined 
                        ? vscode.ConfigurationTarget.Workspace 
                        : vscode.ConfigurationTarget.Global;
                    
                    try {
                        await config.update(newKey, value, target);
                        migratedSettings.push(setting);
                    } catch (error) {
                        console.error(`Failed to migrate ${oldKey} to ${newKey}:`, error);
                    }
                }
                
                // DO NOT remove old setting - keep for backward compatibility
                // This allows gradual migration over multiple releases
            }
        }
        
        // Log migration summary
        if (migratedSettings.length > 0) {
            console.log(`Migrated ${migratedSettings.length} settings from multiAI to magusCouncil`);
        }
    }
}