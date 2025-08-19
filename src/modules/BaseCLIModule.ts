import * as vscode from 'vscode';
import { ICLIModule, ICLIModuleConfig } from './ICLIModule';
import { CLIType } from '../types';
import { ConfigService } from '../core/ConfigService';
import { TerminalManager } from '../core/TerminalManager';
import { Logger } from '../core/Logger';
import { FileHandler } from '../fileHandler';
import { CommandHandler } from '../core/CommandHandler';

export abstract class BaseCLIModule implements ICLIModule {
    abstract readonly cliType: CLIType;
    abstract readonly displayName: string;
    abstract readonly command: string;
    abstract readonly defaultDelay: number;
    
    protected configService: ConfigService;
    protected terminalManager: TerminalManager;
    protected fileHandler: FileHandler;
    protected commandHandler: CommandHandler;
    protected logger: Logger;
    
    constructor(config: ICLIModuleConfig) {
        this.configService = config.configService;
        this.terminalManager = config.terminalManager;
        this.fileHandler = config.fileHandler;
        this.commandHandler = config.commandHandler;
        this.logger = config.logger;
    }
    
    isEnabled(): boolean {
        return this.configService.get<boolean>(`${this.cliType}.enabled`, this.cliType !== 'qwen');
    }
    
    async start(_inActivePane: boolean): Promise<vscode.Terminal | undefined> {
        if (!this.isEnabled()) {
            vscode.window.showWarningMessage(`${this.displayName} is disabled in settings.`);
            return undefined;
        }
        
        // Always reuse existing terminal if available, regardless of pane type
        // This ensures only one instance per CLI type
        const terminal = await this.terminalManager.createOrFocusTerminal(
            this.cliType,
            { 
                preserveFocus: false,
                forceNew: false  // Never force new, always reuse existing
            }
        );
        
        if (terminal) {
            terminal.show(false);
        }
        
        return terminal;
    }
    
    async sendSelectedText(): Promise<void> {
        await this.commandHandler.sendSelectedToCLI(this.cliType);
    }
    
    async sendOpenFiles(): Promise<void> {
        await this.commandHandler.sendOpenFilesToCLI(this.cliType);
    }
    
    async sendFilePath(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
        if (uris && uris.length > 0) {
            await this.fileHandler.sendFilesToTerminal(uris, this.cliType);
        } else if (uri) {
            await this.fileHandler.sendFilesToTerminal(uri, this.cliType);
        } else {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await this.fileHandler.sendFilesToTerminal(activeEditor.document.uri, this.cliType);
            } else {
                vscode.window.showWarningMessage('No file selected');
            }
        }
    }
    
    registerCommands(context: vscode.ExtensionContext): void {
        const commands = [
            {
                id: `gemini-cli-vscode.${this.cliType}.start.newPane`,
                handler: () => this.start(false)
            },
            {
                id: `gemini-cli-vscode.${this.cliType}.start.activePane`,
                handler: () => this.start(true)
            },
            {
                id: `gemini-cli-vscode.${this.cliType}.send.selectedText`,
                handler: () => this.sendSelectedText()
            },
            {
                id: `gemini-cli-vscode.${this.cliType}.send.openFiles`,
                handler: () => this.sendOpenFiles()
            },
            {
                id: `gemini-cli-vscode.${this.cliType}.send.filePath`,
                handler: (uri: vscode.Uri, uris?: vscode.Uri[]) => this.sendFilePath(uri, uris)
            }
        ];
        
        commands.forEach(cmd => {
            context.subscriptions.push(
                vscode.commands.registerCommand(cmd.id, cmd.handler)
            );
        });
    }
    
    dispose(): void {
        // Cleanup if needed
    }
}