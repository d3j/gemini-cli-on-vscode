import * as vscode from 'vscode';
import { FileHandler } from './fileHandler';
import { PromptComposerViewProvider } from './multiAI/promptComposerView';
import { CLIRegistry } from './cliRegistry';
import { MigrationHandler } from './migrationHandler';
import { ConfigService } from './core/ConfigService';
import { TerminalManager } from './core/TerminalManager';
import { Logger } from './core/Logger';
import { CommandHandler } from './core/CommandHandler';
import { CLIType } from './types';
import { MigrationNotifier } from './core/MigrationNotifier';

// Track if extension is already activated
let isActivated = false;
let composerViewRegistration: vscode.Disposable | undefined;

// Core services
let configService: ConfigService;
let terminalManager: TerminalManager;
let logger: Logger;
let cliRegistry: CLIRegistry;
let commandHandler: CommandHandler;
let fileHandler: FileHandler;

export async function activate(context: vscode.ExtensionContext) {
    // Prevent duplicate activation
    if (isActivated) {
        return;
    }
    isActivated = true;
    
    // Initialize core services
    configService = new ConfigService();
    context.subscriptions.push(configService);
    
    logger = new Logger();
    context.subscriptions.push(logger);
    
    // Get extension version from package.json
    const extensionVersion = context.extension?.packageJSON?.version || '0.0.0';
    logger.logActivation(extensionVersion);
    
    // Initialize CLI Registry
    cliRegistry = new CLIRegistry();
    context.subscriptions.push(cliRegistry);
    
    // Initialize TerminalManager with dependencies
    terminalManager = new TerminalManager(configService, cliRegistry);
    context.subscriptions.push(terminalManager);
    
    // Run migration with ConfigService
    try {
        const migrationHandler = new MigrationHandler(configService);
        await migrationHandler.migrate(context);
    } catch (error) {
        logger.error('Migration failed, but continuing extension activation:', error);
    }
    
    // Clean up any ghost terminals from previous sessions
    cleanupGhostTerminals();
    
    // Create FileHandler instance with terminal maps from TerminalManager
    fileHandler = new FileHandler(
        terminalManager.geminiTerminals,
        terminalManager.codexTerminals,
        terminalManager.claudeTerminals,
        terminalManager.qwenTerminals
    );
    
    // Initialize CommandHandler
    commandHandler = new CommandHandler(context, configService, terminalManager, logger, fileHandler);
    commandHandler.createStatusBarItems();
    
    // Register Sidebar Prompt Composer view provider
    const composerViewProvider = new PromptComposerViewProvider(context, fileHandler);
    composerViewRegistration = vscode.window.registerWebviewViewProvider(
        PromptComposerViewProvider.viewId, 
        composerViewProvider
    );
    context.subscriptions.push(composerViewRegistration);
    
    // Register all commands
    registerCommands(context);
    
    // Register event handlers
    registerEventHandlers();
    
    // Initial visibility update
    commandHandler.updateStatusBarVisibility();
    
    // Check for migration notifications
    const migrationNotifier = new MigrationNotifier(configService, logger);
    await migrationNotifier.checkAndNotify();
}

function registerCommands(context: vscode.ExtensionContext) {
    const cliTypes: CLIType[] = ['gemini', 'codex', 'claude', 'qwen'];
    const commands: { [key: string]: (...args: any[]) => any } = {};
    
    // Register CLI-specific commands for each type with hierarchical naming
    cliTypes.forEach(cli => {
        // Start commands
        commands[`gemini-cli-vscode.${cli}.start.newPane`] = () => startCLI(cli, false);
        commands[`gemini-cli-vscode.${cli}.start.activePane`] = () => startCLI(cli, true);
        
        // Send commands
        commands[`gemini-cli-vscode.${cli}.send.selectedText`] = 
            () => commandHandler.sendSelectedToCLI(cli);
        commands[`gemini-cli-vscode.${cli}.send.openFiles`] = 
            () => commandHandler.sendOpenFilesToCLI(cli);
        commands[`gemini-cli-vscode.${cli}.send.filePath`] = 
            (uri: vscode.Uri, uris?: vscode.Uri[]) => handleSendFilePath(uri, uris, cli);
    });
    
    // Feature commands
    Object.assign(commands, {
        'gemini-cli-vscode.saveClipboardToHistory': () => commandHandler.saveClipboardToHistory(),
        'gemini-cli-vscode.launchAllCLIs': () => commandHandler.launchAllCLIs(),
        'gemini-cli-vscode.multiAI.openComposer': openComposer,
        'gemini-cli-vscode.multiAI.askAll': openComposer
    });
    
    // Register all commands
    for (const [commandId, handler] of Object.entries(commands)) {
        context.subscriptions.push(
            vscode.commands.registerCommand(commandId, handler)
        );
    }
}

function registerEventHandlers() {
    // Update status bar visibility when terminal or editor changes
    vscode.window.onDidChangeActiveTerminal(() => commandHandler.updateStatusBarVisibility());
    vscode.window.onDidOpenTerminal(() => commandHandler.updateStatusBarVisibility());
    vscode.window.onDidChangeActiveTextEditor(() => commandHandler.updateStatusBarVisibility());
    vscode.window.onDidCloseTerminal(() => commandHandler.updateStatusBarVisibility());
}

async function startCLI(cliType: CLIType, inActivePane: boolean) {
    const enabled = configService.get<boolean>(`${cliType}.enabled`, cliType !== 'qwen');
    if (!enabled) {
        vscode.window.showWarningMessage(`${getCLIDisplayName(cliType)} is disabled in settings.`);
        return;
    }
    
    const viewColumn = inActivePane 
        ? vscode.ViewColumn.Active 
        : getViewColumnForEditorButton();
    
    const terminal = await terminalManager.createOrFocusTerminal(
        cliType,
        { preserveFocus: false, location: viewColumn }
    );
    
    if (terminal) {
        terminal.show(false);
    }
    
    commandHandler.updateStatusBarVisibility();
}

async function handleSendFilePath(uri: vscode.Uri, uris: vscode.Uri[] | undefined, cliType: CLIType) {
    if (uris && uris.length > 0) {
        await fileHandler.sendFilesToTerminal(uris, cliType);
    } else if (uri) {
        await fileHandler.sendFilesToTerminal(uri, cliType);
    } else {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            await fileHandler.sendFilesToTerminal(activeEditor.document.uri, cliType);
        } else {
            vscode.window.showWarningMessage('No file selected');
        }
    }
}

async function openComposer() {
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

function cleanupGhostTerminals() {
    const cliNames = ['Gemini CLI', 'Codex CLI', 'Claude Code', 'Qwen CLI'];
    vscode.window.terminals.forEach(terminal => {
        if (cliNames.includes(terminal.name) && !terminal.exitStatus) {
            const pidPromise = terminal.processId;
            if (pidPromise && typeof pidPromise.then === 'function') {
                (pidPromise as Promise<number | undefined>).then(pid => {
                    if (!pid) {
                        terminal.dispose();
                    }
                }).catch(() => {
                    terminal.dispose();
                });
            }
        }
    });
}

function getViewColumnForEditorButton(): vscode.ViewColumn {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const currentColumn = activeEditor.viewColumn || vscode.ViewColumn.One;
        return currentColumn === vscode.ViewColumn.One ? vscode.ViewColumn.Two : currentColumn;
    }
    return vscode.ViewColumn.Two;
}

function getCLIDisplayName(cliType: CLIType): string {
    const names = {
        'gemini': 'Gemini CLI',
        'codex': 'Codex CLI',
        'claude': 'Claude Code',
        'qwen': 'Qwen CLI'
    };
    return names[cliType] || cliType;
}

export function deactivate() {
    // Dispose registered webview provider
    try {
        composerViewRegistration?.dispose();
        composerViewRegistration = undefined;
    } catch (error) {
        console.error('Error disposing composer view registration:', error);
    }
    
    // Reset activation flag
    isActivated = false;
}