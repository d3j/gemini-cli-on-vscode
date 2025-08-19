import * as vscode from 'vscode';
import { ConfigService } from '../core/ConfigService';
import { Logger } from '../core/Logger';

/**
 * Manages status bar items for the extension
 */
export class StatusBarManager implements vscode.Disposable {
    private saveHistoryStatusBarItem: vscode.StatusBarItem | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configService: ConfigService,
        private readonly logger: Logger
    ) {}

    /**
     * Initialize status bar items
     */
    public initialize(): void {
        this.createStatusBarItems();
        this.registerEventHandlers();
        this.updateVisibility();
        
        this.logger.info('StatusBarManager initialized');
    }

    /**
     * Create status bar items
     */
    private createStatusBarItems(): void {
        // Create status bar item for save history
        this.saveHistoryStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        this.saveHistoryStatusBarItem.command = 'gemini-cli-vscode.saveToHistory';
        this.saveHistoryStatusBarItem.text = '$(save) Save to History';
        this.saveHistoryStatusBarItem.tooltip = 'Save current clipboard to history';
        
        this.disposables.push(this.saveHistoryStatusBarItem);
        this.context.subscriptions.push(this.saveHistoryStatusBarItem);
    }

    /**
     * Register event handlers for status bar updates
     */
    private registerEventHandlers(): void {
        // Update visibility when configuration changes
        this.disposables.push(
            this.configService.onConfigurationChange((changedKeys) => {
                if (changedKeys.includes('saveToHistory.showInStatusBar')) {
                    this.updateVisibility();
                }
            })
        );

        // Update visibility when window state changes
        const windowEvents = [
            vscode.window.onDidChangeActiveTerminal,
            vscode.window.onDidOpenTerminal,
            vscode.window.onDidChangeActiveTextEditor,
            vscode.window.onDidCloseTerminal
        ];

        windowEvents.forEach(event => {
            this.disposables.push(event(() => this.updateVisibility()));
        });
    }

    /**
     * Update status bar visibility based on configuration
     */
    public updateVisibility(): void {
        const showInStatusBar = this.configService.get<boolean>('saveToHistory.showInStatusBar', true);
        
        if (this.saveHistoryStatusBarItem) {
            if (showInStatusBar) {
                this.saveHistoryStatusBarItem.show();
                this.logger.debug('Status bar item shown');
            } else {
                this.saveHistoryStatusBarItem.hide();
                this.logger.debug('Status bar item hidden');
            }
        }
    }

    /**
     * Dispose of status bar resources
     */
    public dispose(): void {
        this.disposables.forEach(disposable => {
            try {
                disposable?.dispose();
            } catch {
                // Ignore disposal errors
            }
        });
        this.disposables = [];
        this.logger?.info('StatusBarManager disposed');
    }
}