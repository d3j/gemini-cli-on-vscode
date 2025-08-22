import * as vscode from 'vscode';
import { CLIType } from '../types';
import { ConfigService } from './ConfigService';
import { CLIRegistry } from '../cliRegistry';
import { Logger } from './Logger';

/**
 * Terminal lifecycle event data
 */
interface TerminalLifecycleEvent {
    terminal?: vscode.Terminal;
    terminalId: string;
    cliType: CLIType;
}

/**
 * Terminal text sent event data (test/dev only)
 */
interface TerminalTextSentEvent {
    terminal: vscode.Terminal;
    text: string;
    cliType: CLIType;
}

/**
 * Manages terminal creation, reuse, and interaction for different CLIs
 */
export class TerminalManager implements vscode.Disposable {
    private terminals: Map<string, vscode.Terminal> = new Map();
    private disposables: vscode.Disposable[] = [];
    private terminalCounter = 0;
    private terminalCliTypeMap = new Map<vscode.Terminal, CLIType>();
    
    // Event emitters
    private readonly _onDidCreateTerminal = new vscode.EventEmitter<TerminalLifecycleEvent>();
    private readonly _onDidDisposeTerminal = new vscode.EventEmitter<TerminalLifecycleEvent>();
    
    // Development/test only event
    private readonly _onDidSendText = process.env.VSCODE_TEST 
        ? new vscode.EventEmitter<TerminalTextSentEvent>()
        : undefined;
    
    // Public events
    readonly onDidCreateTerminal: vscode.Event<TerminalLifecycleEvent> = this._onDidCreateTerminal.event;
    readonly onDidDisposeTerminal: vscode.Event<TerminalLifecycleEvent> = this._onDidDisposeTerminal.event;
    readonly onDidSendText: vscode.Event<TerminalTextSentEvent> | undefined = this._onDidSendText?.event;
    
    // Legacy terminal maps for compatibility with FileHandler
    public geminiTerminals = new Map<string, vscode.Terminal>();
    public codexTerminals = new Map<string, vscode.Terminal>();
    public claudeTerminals = new Map<string, vscode.Terminal>();
    public qwenTerminals = new Map<string, vscode.Terminal>();
    
    constructor(
        private context: vscode.ExtensionContext,
        private configService: ConfigService,
        private cliRegistry: CLIRegistry,
        private logger?: Logger
    ) {
        // Register terminal close handler
        const closeHandler = vscode.window.onDidCloseTerminal(terminal => {
            this.handleTerminalClose(terminal);
        });
        this.disposables.push(closeHandler);
        
        // Add event emitters to disposables
        this.disposables.push(this._onDidCreateTerminal);
        this.disposables.push(this._onDidDisposeTerminal);
        if (this._onDidSendText) {
            this.disposables.push(this._onDidSendText);
        }
    }
    
    /**
     * Get or create a terminal for the specified CLI
     */
    async getOrCreate(cli: CLIType, placement: 'new' | 'active'): Promise<vscode.Terminal> {
        const key = this.getTerminalKey(cli, placement);
        
        // Check for existing terminal (only for 'active' placement)
        if (placement === 'active') {
            const existing = this.terminals.get(key);
            if (existing && !existing.exitStatus) {
                return existing;
            }
        }
        
        // Create new terminal
        const terminal = await this.createTerminal(cli, placement);
        this.terminals.set(key, terminal);
        
        return terminal;
    }
    
    /**
     * Paste text and send Enter with appropriate delay
     */
    async pasteAndEnter(cli: CLIType, text: string): Promise<void> {
        const terminal = this.findTerminal(cli);
        if (!terminal) {
            throw new Error(`No terminal found for CLI: ${cli}`);
        }
        
        terminal.show();
        
        // Get initial delay from config
        const initialDelay = this.configService.get('magusCouncil.composer.delays.initial', 100);
        
        // Wait for initial delay
        await new Promise(resolve => setTimeout(resolve, initialDelay));
        
        // Save current clipboard content AFTER initial delay
        const originalClipboard = await vscode.env.clipboard.readText();
        
        try {
            // Copy text to clipboard and paste
            await vscode.env.clipboard.writeText(text);
            await vscode.commands.executeCommand('workbench.action.terminal.paste');
            
            // Wait for paste completion (50ms)
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Conditional restore: only if clipboard still contains our text
            const currentClipboard = await vscode.env.clipboard.readText();
            if (currentClipboard === text) {
                await vscode.env.clipboard.writeText(originalClipboard);
            }
        } catch (error) {
            // Attempt to restore clipboard even on error
            try {
                const currentClipboard = await vscode.env.clipboard.readText();
                if (currentClipboard === text) {
                    await vscode.env.clipboard.writeText(originalClipboard);
                }
            } catch (restoreError) {
                this.logger?.error('Failed to restore clipboard in pasteAndEnter', restoreError);
            }
            throw error;
        }
        
        // Get CLI-specific enter delay
        const enterDelay = this.configService.getCliDelay(cli, text.length);
        
        // Send Enter after delay
        await new Promise(resolve => setTimeout(resolve, enterDelay));
        terminal.sendText('', true);
    }
    
    /**
     * Send text to terminal
     */
    async sendText(cli: CLIType, text: string, opts?: { enter?: boolean }): Promise<void> {
        const terminal = this.findTerminal(cli);
        if (!terminal) {
            throw new Error(`No terminal found for CLI: ${cli}`);
        }
        
        terminal.show();
        terminal.sendText(text, opts?.enter !== false);
    }
    
    /**
     * Find existing terminal for CLI
     */
    findTerminal(cli: CLIType): vscode.Terminal | undefined {
        // Try to find in our map
        for (const [key, terminal] of this.terminals.entries()) {
            if (key.startsWith(`${cli}-`) && !terminal.exitStatus) {
                return terminal;
            }
        }
        
        return undefined;
    }
    
    /**
     * Clear terminal for specific CLI
     */
    clearTerminal(cli: CLIType): void {
        const keysToDelete: string[] = [];
        for (const key of this.terminals.keys()) {
            if (key.startsWith(`${cli}-`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.terminals.delete(key));
    }
    
    /**
     * Clear all terminals
     */
    clearAll(): void {
        this.terminals.clear();
    }
    
    /**
     * Create a new terminal
     */
    private async createTerminal(cli: CLIType, placement: 'new' | 'active'): Promise<vscode.Terminal> {
        const startTime = Date.now();
        
        const cliConfig = this.cliRegistry.getCLI(cli);
        if (!cliConfig) {
            throw new Error(`Unknown CLI type: ${cli}`);
        }
        
        // Get icon path relative to extension root
        const iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'images', cliConfig.icon);
        
        const terminalOptions: vscode.TerminalOptions = {
            name: cliConfig.name,
            iconPath: iconPath,
            location: this.getTerminalLocation(placement),
            isTransient: true,  // Prevent terminal persistence on restart
            hideFromUser: false,  // Show in terminal dropdown but don't persist
            env: {}  // Clean environment to prevent restoration
        };
        
        const terminal = vscode.window.createTerminal(terminalOptions);
        
        // Navigate to workspace and start CLI
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            terminal.sendText(`cd "${workspaceFolder.uri.fsPath}"`);
        }
        
        // Start the CLI
        const command = this.cliRegistry.getCommand(cli);
        terminal.sendText(command);
        
        terminal.show();
        
        // Also store in legacy maps for compatibility
        const legacyMap = this.getTerminalMapForCLI(cli);
        const terminalKey = this.getTerminalKey(cli, placement);
        legacyMap.set(terminalKey, terminal);
        
        // Track CLI type for this terminal
        this.terminalCliTypeMap.set(terminal, cli);
        
        // Fire terminal created event
        this._onDidCreateTerminal.fire({
            terminal,
            terminalId: terminal.name,
            cliType: cli
        });
        
        // Log performance if enabled
        const performanceEnabled = this.configService.get<boolean>('diagnostics.performance', false);
        if (performanceEnabled) {
            const duration = Date.now() - startTime;
            this.logger?.debug(`Terminal created for ${cli} in ${duration}ms`);
        }
        
        return terminal;
    }
    
    /**
     * Get terminal location based on configuration
     */
    private getTerminalLocation(_placement: 'new' | 'active'): vscode.TerminalLocation | vscode.TerminalEditorLocationOptions {
        // Get terminal grouping behavior configuration
        const groupingBehavior = this.configService.get<string>('terminal.groupingBehavior', 'same');
        
        if (groupingBehavior === 'new') {
            // When groupingBehavior is 'new', create terminals in new editor groups
            // Use ViewColumn.Beside to create a new split group
            return {
                viewColumn: vscode.ViewColumn.Beside,
                preserveFocus: false
            };
        } else {
            // When groupingBehavior is 'same', create terminals in the current editor group
            // Use ViewColumn.Active to add to the current group
            return {
                viewColumn: vscode.ViewColumn.Active,
                preserveFocus: false
            };
        }
    }
    
    /**
     * Generate terminal key
     */
    private getTerminalKey(cli: CLIType, placement: 'new' | 'active'): string {
        if (placement === 'new') {
            // Generate unique key for new terminals
            this.terminalCounter++;
            return `${cli}-global-${this.terminalCounter}`;
        }
        
        // Use global key for reuse
        return `${cli}-global`;
    }
    
    /**
     * Handle terminal close event
     */
    private handleTerminalClose(terminal: vscode.Terminal): void {
        // Get CLI type before removal
        const cliType = this.terminalCliTypeMap.get(terminal);
        
        // Remove from our map
        for (const [key, term] of this.terminals.entries()) {
            if (term === terminal) {
                this.terminals.delete(key);
                break;
            }
        }
        
        // Fire terminal disposed event if we know the CLI type
        if (cliType) {
            this._onDidDisposeTerminal.fire({
                terminalId: terminal.name,
                cliType
            });
            this.terminalCliTypeMap.delete(terminal);
        }
        
        // Also clean up legacy terminal maps
        [this.geminiTerminals, this.codexTerminals, this.claudeTerminals, this.qwenTerminals].forEach(terminalMap => {
            terminalMap.forEach((value, key) => {
                if (value === terminal) {
                    terminalMap.delete(key);
                }
            });
        });
    }
    
    /**
     * Dispose of all resources
     */
    dispose(): void {
        // Dispose all active terminals
        this.terminals.forEach((terminal) => {
            if (terminal && !terminal.exitStatus) {
                terminal.dispose();
            }
        });
        
        // Clear all terminal maps
        this.terminals.clear();
        this.geminiTerminals.clear();
        this.codexTerminals.clear();
        this.claudeTerminals.clear();
        this.qwenTerminals.clear();
        
        // Dispose event handlers
        this.disposables.forEach(d => {
            if (d && typeof d.dispose === 'function') {
                d.dispose();
            }
        });
    }
    
    /**
     * Get legacy terminal maps for a specific CLI
     */
    public getTerminalMapForCLI(cliType: CLIType): Map<string, vscode.Terminal> {
        switch (cliType) {
            case 'gemini': return this.geminiTerminals;
            case 'codex': return this.codexTerminals;
            case 'claude': return this.claudeTerminals;
            case 'qwen': return this.qwenTerminals;
            default: return new Map();
        }
    }
    
    /**
     * Create or focus existing terminal for CLI
     */
    public async createOrFocusTerminal(
        cli: CLIType,
        options?: {
            preserveFocus?: boolean;
            forceNew?: boolean;  // Force creating a new terminal instead of reusing
        }
    ): Promise<vscode.Terminal | undefined> {
        try {
            // Check for existing terminal (unless forceNew is true)
            let terminal = options?.forceNew ? undefined : this.findTerminal(cli);
            
            if (!terminal || terminal.exitStatus) {
                // Create new terminal
                // Use 'new' placement for new terminals, 'active' for reuse
                const placement = options?.forceNew ? 'new' : 'active';
                terminal = await this.getOrCreate(cli, placement);
            }
            
            // Show terminal with specified options
            if (terminal) {
                terminal.show(options?.preserveFocus);
            }
            
            return terminal;
        } catch (error) {
            console.error(`Failed to create or focus terminal for ${cli}:`, error);
            return undefined;
        }
    }
    
    /**
     * Send text to terminal with CLI-specific delay
     */
    public async sendTextToTerminal(
        terminal: vscode.Terminal,
        text: string,
        cli: CLIType,
        sendEnter: boolean = false
    ): Promise<void> {
        const startTime = Date.now();
        
        // Show terminal
        terminal.show();
        
        // Get CLI-specific delay
        const delay = this.configService.getCliDelay(cli, text.length);
        
        // Wait for initial delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Save current clipboard content
        const originalClipboard = await vscode.env.clipboard.readText();
        
        try {
            // Copy text to clipboard and paste
            await vscode.env.clipboard.writeText(text);
            await vscode.commands.executeCommand('workbench.action.terminal.paste');
            
            // Wait for paste completion (50ms)
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Conditional restore: only if clipboard still contains our text
            const currentClipboard = await vscode.env.clipboard.readText();
            if (currentClipboard === text) {
                await vscode.env.clipboard.writeText(originalClipboard);
            }
        } catch (error) {
            // Attempt to restore clipboard even on error
            try {
                const currentClipboard = await vscode.env.clipboard.readText();
                if (currentClipboard === text) {
                    await vscode.env.clipboard.writeText(originalClipboard);
                }
            } catch (restoreError) {
                this.logger?.error('Failed to restore clipboard', restoreError);
            }
            throw error;
        }
        
        // Send Enter after delay only if requested
        if (sendEnter) {
            await new Promise(resolve => setTimeout(resolve, delay));
            terminal.sendText('', true);
        }
        
        // Fire text sent event for testing
        if (this._onDidSendText) {
            this._onDidSendText.fire({
                terminal,
                text,
                cliType: cli
            });
        }
        
        // Log performance if enabled
        const performanceEnabled = this.configService.get<boolean>('diagnostics.performance', false);
        if (performanceEnabled) {
            const duration = Date.now() - startTime;
            this.logger?.debug(`Text sent to ${cli} terminal in ${duration}ms (${text.length} chars)`);
        }
    }
}
