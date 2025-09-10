import * as vscode from 'vscode';
import { FileHandler } from '../fileHandler';
import { PromptComposerViewProvider } from '../multiAI/promptComposerView';
import { CLIRegistry } from '../cliRegistry';
import { MigrationHandler } from '../migrationHandler';
import { ConfigService } from './ConfigService';
import { TerminalManager } from './TerminalManager';
import { Logger } from './Logger';
import { CommandHandler } from './CommandHandler';
import { MigrationNotifier } from './MigrationNotifier';
import { CLIModuleManager } from '../modules/CLIModuleManager';
import { TerminalCleanup } from './TerminalCleanup';
import { StatusBarManager } from '../ui/StatusBarManager';
import { HistoryService } from './HistoryService';
import { TemplatesViewProvider } from '../templates/templatesView';

// Track global registration state to prevent duplicates
let isComposerViewRegistered = false;

export class ExtensionBootstrap {
    public configService!: ConfigService;
    public terminalManager!: TerminalManager;
    public logger!: Logger;
    public cliRegistry!: CLIRegistry;
    public commandHandler!: CommandHandler;
    public fileHandler!: FileHandler;
    public cliModuleManager!: CLIModuleManager;
    public statusBarManager!: StatusBarManager;
    public historyService!: HistoryService;
    public composerViewRegistration?: vscode.Disposable;
    public promptComposerViewProvider?: PromptComposerViewProvider;
    public templatesViewRegistration?: vscode.Disposable;
    public templatesViewProvider?: TemplatesViewProvider;
    private startTime: number = 0;
    
    async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.startTime = Date.now();
        
        // Initialize ready state context key to false first
        await vscode.commands.executeCommand('setContext', 'gemini-cli-vscode.isReady', false);
        
        // Initialize core services
        this.configService = new ConfigService();
        context.subscriptions.push(this.configService);
        
        this.logger = new Logger();
        context.subscriptions.push(this.logger);
        
        // Log activation
        const extensionVersion = context.extension?.packageJSON?.version || '0.0.0';
        this.logger.logActivation(extensionVersion);
        
        // Initialize CLI Registry
        this.cliRegistry = new CLIRegistry();
        context.subscriptions.push(this.cliRegistry);
        
        // Initialize TerminalManager
        this.terminalManager = new TerminalManager(context, this.configService, this.cliRegistry, this.logger);
        context.subscriptions.push(this.terminalManager);
        
        // Run migration
        await this.runMigration(context);
        
        // Clean up ghost terminals
        TerminalCleanup.cleanupGhostTerminals();
        
        // Initialize FileHandler
        this.fileHandler = new FileHandler(
            this.terminalManager.geminiTerminals,
            this.terminalManager.codexTerminals,
            this.terminalManager.claudeTerminals,
            this.terminalManager.qwenTerminals
        );
        
        // Initialize HistoryService
        this.historyService = new HistoryService(
            this.configService,
            this.logger
        );
        context.subscriptions.push(this.historyService);
        
        // Initialize CommandHandler with dependency injection
        this.commandHandler = new CommandHandler(
            context,
            this.configService,
            this.terminalManager,
            this.logger,
            this.fileHandler,
            this.historyService
        );
        
        // Initialize StatusBarManager
        this.statusBarManager = new StatusBarManager(
            context,
            this.configService,
            this.logger
        );
        this.statusBarManager.initialize();
        context.subscriptions.push(this.statusBarManager);
        
        // Register Sidebar Prompt Composer (after fileHandler initialization)
        this.registerComposerView(context);
        // Register Templates Panel
        this.registerTemplatesView(context);
        
        // Set PromptComposerViewProvider on CommandHandler for MAGUS Council integration
        if (this.commandHandler && this.promptComposerViewProvider) {
            this.commandHandler.setPromptComposerViewProvider(this.promptComposerViewProvider);
        }
        
        // Initialize CLI Module Manager
        this.cliModuleManager = new CLIModuleManager({
            configService: this.configService,
            terminalManager: this.terminalManager,
            fileHandler: this.fileHandler,
            commandHandler: this.commandHandler,
            logger: this.logger
        });
        
        // Register commands
        this.registerCommands(context);
        
        // Register event handlers
        this.registerEventHandlers();
        
        // Check for migration notifications
        await this.checkMigrationNotifications();
        
        // Set ready state context key to enable UI buttons
        try {
            await vscode.commands.executeCommand('setContext', 'gemini-cli-vscode.isReady', true);
            this.logger.info('Context key "gemini-cli-vscode.isReady" set to true');
        } catch (error) {
            this.logger.error('Failed to set context key "gemini-cli-vscode.isReady":', error);
        }
        
        // Log activation time
        const activationTime = Date.now() - this.startTime;
        this.logger.debug('Performance', { name: 'activation.ms', ms: activationTime });
        this.logger.info(`Extension initialization completed in ${activationTime}ms`);
    }
    
    private async runMigration(context: vscode.ExtensionContext): Promise<void> {
        try {
            const migrationHandler = new MigrationHandler(this.configService);
            await migrationHandler.migrate(context);
        } catch (error) {
            this.logger.error('Migration failed, but continuing extension activation:', error);
        }
    }
    
    private registerComposerView(context: vscode.ExtensionContext): void {
        // Skip if already registered (prevents duplicate registration in tests)
        if (isComposerViewRegistered) {
            this.logger.warn('Composer view already registered, skipping');
            return;
        }
        
        this.promptComposerViewProvider = new PromptComposerViewProvider(context, this.fileHandler);
        this.composerViewRegistration = vscode.window.registerWebviewViewProvider(
            PromptComposerViewProvider.viewId,
            this.promptComposerViewProvider
        );
        context.subscriptions.push(this.composerViewRegistration);
        isComposerViewRegistered = true;
    }

    private registerTemplatesView(context: vscode.ExtensionContext): void {
        try {
            this.templatesViewProvider = new TemplatesViewProvider(context);
            this.templatesViewRegistration = vscode.window.registerWebviewViewProvider(
                TemplatesViewProvider.viewId,
                this.templatesViewProvider
            );
            context.subscriptions.push(this.templatesViewRegistration);
            // Wire insert handler to forward to PromptComposer
            this.templatesViewProvider.setInsertHandler(async ({ content, position, replaceSelection, sourceId }) => {
                // Ensure composer is visible then send
                try {
                    await vscode.commands.executeCommand('workbench.view.extension.gemini-cli-vscode');
                    await vscode.commands.executeCommand('gemini-cli-vscode.promptComposerView.focus');
                } catch {}
                // Post message to composer webview if available
                try {
                    const payload: any = { type: 'composer/insert', payload: { content, position, replacePrompt: !!replaceSelection, sourceId } };
                    this.promptComposerViewProvider?.postMessageToWebview(payload);
                } catch (e) {
                    this.logger?.warn('Failed to post composer/insert to webview, fallback to clipboard', e);
                    await vscode.env.clipboard.writeText(content);
                    vscode.window.showInformationMessage('Content copied. Paste it into the MAGUS Council prompt.');
                }
            });
        } catch (error) {
            this.logger?.error('Failed to register TemplatesView:', error);
        }
    }
    
    private registerCommands(context: vscode.ExtensionContext): void {
        // Register CLI module commands
        this.cliModuleManager.registerAllCommands(context);
        
        // Register feature commands
        const featureCommands = [
            {
                id: 'gemini-cli-vscode.saveToHistory',
                handler: () => this.commandHandler.saveClipboardToHistory()
            },
            {
                id: 'gemini-cli-vscode.saveClipboardToHistory',
                handler: () => this.commandHandler.saveClipboardToHistory()
            },
            {
                id: 'gemini-cli-vscode.launchAllCLIs',
                handler: () => this.commandHandler.launchAllCLIs()
            },
            {
                id: 'gemini-cli-vscode.multiAI.openComposer',
                handler: this.openComposer.bind(this)
            },
            {
                id: 'gemini-cli-vscode.multiAI.askAll',
                handler: this.openComposer.bind(this)
            },
            {
                id: 'gemini-cli-vscode.multiAI.send.selectedText',
                handler: () => this.commandHandler.sendSelectedToMAGUSCouncil()
            },
            {
                id: 'gemini-cli-vscode.multiAI.send.filePath',
                handler: (uri: vscode.Uri | undefined, uris: vscode.Uri[] | undefined) => 
                    this.commandHandler.sendFilePathToMAGUSCouncil(uri, uris)
            }
        ];
        
        featureCommands.forEach(cmd => {
            context.subscriptions.push(
                vscode.commands.registerCommand(cmd.id, cmd.handler)
            );
        });
        
        // Log performance if enabled
        const performanceEnabled = this.configService.get<boolean>('diagnostics.performance', false);
        if (performanceEnabled) {
            const duration = Date.now() - this.startTime;
            this.logger.info(`Extension activation completed in ${duration}ms`);
        }
    }
    
    private registerEventHandlers(): void {
        // Event handlers are now managed by individual modules
    }
    
    private async checkMigrationNotifications(): Promise<void> {
        const migrationNotifier = new MigrationNotifier(this.configService, this.logger);
        await migrationNotifier.checkAndNotify();
    }
    
    private async openComposer(): Promise<void> {
        try {
            await vscode.commands.executeCommand('workbench.view.extension.gemini-cli-vscode');
        } catch {
            // ignore
        }
        try {
            await vscode.commands.executeCommand('gemini-cli-vscode.promptComposerView.focus');
        } catch {
            // ignore
        }
    }
    
    dispose(): void {
        // Dispose all services in reverse order of initialization
        this.cliModuleManager?.dispose();
        this.statusBarManager?.dispose();
        this.historyService?.dispose();
        this.commandHandler?.dispose();
        (this.fileHandler as any) = undefined;
        this.terminalManager?.dispose();
        this.cliRegistry?.dispose();
        this.logger?.dispose();
        this.configService?.dispose();
        
        // Dispose composer view registration
        if (this.composerViewRegistration) {
            this.composerViewRegistration.dispose();
            this.composerViewRegistration = undefined;
            isComposerViewRegistered = false;
        }
        if (this.templatesViewRegistration) {
            this.templatesViewRegistration.dispose();
            this.templatesViewRegistration = undefined;
        }
    }
}
