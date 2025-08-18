import * as vscode from 'vscode';
import { ConfigService } from './ConfigService';
import { Logger } from './Logger';

/**
 * Handles migration notifications for breaking changes
 */
export class MigrationNotifier {
    private static readonly MIGRATION_KEY = 'migration.v3.notified';
    private static readonly MIGRATION_URL = 'https://github.com/jparkrr/gemini-cli-on-vscode/blob/main/MIGRATION.md';
    
    // Old command names that need migration
    private static readonly OLD_COMMANDS = [
        'gemini-cli-vscode.startInNewPane',
        'gemini-cli-vscode.startInActivePane',
        'gemini-cli-vscode.codexStartInNewPane',
        'gemini-cli-vscode.codexStartInActivePane',
        'gemini-cli-vscode.claudeStartInNewPane',
        'gemini-cli-vscode.claudeStartInActivePane',
        'gemini-cli-vscode.qwenStartInNewPane',
        'gemini-cli-vscode.qwenStartInActivePane',
        'gemini-cli-vscode.sendSelectedTextToGemini',
        'gemini-cli-vscode.sendSelectedTextToCodex',
        'gemini-cli-vscode.sendSelectedTextToClaude',
        'gemini-cli-vscode.sendSelectedTextToQwen',
        'gemini-cli-vscode.sendOpenFilePathToGemini',
        'gemini-cli-vscode.sendOpenFilePathToCodex',
        'gemini-cli-vscode.sendOpenFilePathToClaude',
        'gemini-cli-vscode.sendOpenFilePathToQwen',
        'gemini-cli-vscode.sendFilePathToGemini',
        'gemini-cli-vscode.sendFilePathToCodex',
        'gemini-cli-vscode.sendFilePathToClaude',
        'gemini-cli-vscode.sendFilePathToQwen'
    ];
    
    constructor(
        private configService: ConfigService,
        private logger: Logger
    ) {}
    
    /**
     * Check if migration notification is needed and show it
     */
    public async checkAndNotify(): Promise<void> {
        try {
            // Check if already notified
            const alreadyNotified = this.configService.get<boolean>(MigrationNotifier.MIGRATION_KEY, false);
            if (alreadyNotified) {
                return;
            }
            
            // Check if user has custom keybindings for old commands
            const hasOldKeybindings = await this.hasOldKeybindings();
            if (!hasOldKeybindings) {
                // Mark as notified since no migration needed
                await this.markAsNotified();
                return;
            }
            
            // Show migration notification
            await this.showMigrationNotification();
        } catch (error) {
            this.logger.error('Failed to check migration status', error);
        }
    }
    
    /**
     * Check if user has keybindings for old commands
     */
    private async hasOldKeybindings(): Promise<boolean> {
        try {
            // Get all keybindings
            const keybindingsFile = await this.getKeybindingsFile();
            if (!keybindingsFile) {
                return false;
            }
            
            // Check if any old command is present
            const content = keybindingsFile.toString();
            return MigrationNotifier.OLD_COMMANDS.some(cmd => content.includes(cmd));
        } catch (error) {
            this.logger.warn('Could not check keybindings', error);
            return false;
        }
    }
    
    /**
     * Get keybindings file content
     */
    private async getKeybindingsFile(): Promise<string | undefined> {
        try {
            // Try to get user keybindings
            const keybindingsUri = vscode.Uri.joinPath(
                vscode.Uri.file(this.getUserDataPath()),
                'User',
                'keybindings.json'
            );
            
            const fileContent = await vscode.workspace.fs.readFile(keybindingsUri);
            return Buffer.from(fileContent).toString('utf8');
        } catch {
            // No custom keybindings file
            return undefined;
        }
    }
    
    /**
     * Get user data path based on platform
     */
    private getUserDataPath(): string {
        const appName = 'Code';
        const platform = process.platform;
        
        if (platform === 'win32') {
            return process.env.APPDATA + `\\${appName}`;
        } else if (platform === 'darwin') {
            return process.env.HOME + `/Library/Application Support/${appName}`;
        } else {
            return process.env.HOME + `/.config/${appName}`;
        }
    }
    
    /**
     * Show migration notification to user
     */
    private async showMigrationNotification(): Promise<void> {
        const message = 'Gemini CLI: Your keyboard shortcuts need updating for v0.3.0. ' +
                       'Command names have been reorganized for better consistency.';
        
        const selection = await vscode.window.showInformationMessage(
            message,
            'View Migration Guide',
            'Dismiss',
            'Don\'t Show Again'
        );
        
        switch (selection) {
            case 'View Migration Guide':
                await this.openMigrationGuide();
                // Still show the notification next time until they explicitly dismiss
                break;
                
            case 'Don\'t Show Again':
                await this.markAsNotified();
                this.logger.info('User dismissed migration notification permanently');
                break;
                
            case 'Dismiss':
                // Will show again next time
                this.logger.info('User dismissed migration notification temporarily');
                break;
        }
    }
    
    /**
     * Open migration guide in browser
     */
    private async openMigrationGuide(): Promise<void> {
        try {
            await vscode.env.openExternal(vscode.Uri.parse(MigrationNotifier.MIGRATION_URL));
            this.logger.info('Opened migration guide in browser');
        } catch (error) {
            this.logger.error('Failed to open migration guide', error);
            vscode.window.showErrorMessage('Failed to open migration guide. Please visit: ' + MigrationNotifier.MIGRATION_URL);
        }
    }
    
    /**
     * Mark migration as notified
     */
    private async markAsNotified(): Promise<void> {
        const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
        await config.update(MigrationNotifier.MIGRATION_KEY, true, vscode.ConfigurationTarget.Global);
    }
    
    /**
     * Reset notification status (for testing)
     */
    public async resetNotificationStatus(): Promise<void> {
        const config = vscode.workspace.getConfiguration('gemini-cli-vscode');
        await config.update(MigrationNotifier.MIGRATION_KEY, false, vscode.ConfigurationTarget.Global);
    }
}