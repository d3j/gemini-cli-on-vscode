import * as vscode from 'vscode';
import { CLIType } from '../types';
import { ConfigService } from './ConfigService';
import { CLIRegistry } from '../cliRegistry';

/**
 * Manages terminal creation, reuse, and interaction for different CLIs
 */
export class TerminalManager {
    private terminals: Map<string, vscode.Terminal> = new Map();
    private disposables: vscode.Disposable[] = [];
    private terminalCounter = 0;
    
    // Legacy terminal maps for compatibility with FileHandler
    public geminiTerminals = new Map<string, vscode.Terminal>();
    public codexTerminals = new Map<string, vscode.Terminal>();
    public claudeTerminals = new Map<string, vscode.Terminal>();
    public qwenTerminals = new Map<string, vscode.Terminal>();
    
    constructor(
        private configService: ConfigService,
        private cliRegistry: CLIRegistry
    ) {
        // Register terminal close handler
        const closeHandler = vscode.window.onDidCloseTerminal(terminal => {
            this.handleTerminalClose(terminal);
        });
        this.disposables.push(closeHandler);
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
        
        // Copy text to clipboard and paste
        await new Promise<void>(resolve => {
            setTimeout(async () => {
                await vscode.env.clipboard.writeText(text);
                await vscode.commands.executeCommand('workbench.action.terminal.paste');
                
                // Get CLI-specific enter delay
                const enterDelay = this.configService.getCliDelay(cli, text.length);
                
                // Send Enter after delay
                setTimeout(() => {
                    terminal.sendText('', true);
                    resolve();
                }, enterDelay);
            }, initialDelay);
        });
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
        const cliConfig = this.cliRegistry.getCLI(cli);
        if (!cliConfig) {
            throw new Error(`Unknown CLI type: ${cli}`);
        }
        
        const terminalOptions: vscode.TerminalOptions = {
            name: cliConfig.name,
            iconPath: vscode.Uri.file(cliConfig.icon),
            location: this.getTerminalLocation(placement)
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
        legacyMap.set('global', terminal);
        
        return terminal;
    }
    
    /**
     * Get terminal location based on placement
     */
    private getTerminalLocation(placement: 'new' | 'active'): vscode.TerminalLocation {
        if (placement === 'new') {
            const groupingBehavior = this.configService.get<string>('terminal.groupingBehavior', 'same');
            
            if (groupingBehavior === 'new') {
                // Create in new group (split terminal) - use Editor area
                return vscode.TerminalLocation.Editor;
            } else {
                // Default: same group behavior - use Panel
                return vscode.TerminalLocation.Panel;
            }
        }
        
        // Active placement: use panel
        return vscode.TerminalLocation.Panel;
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
        // Remove from our map
        for (const [key, term] of this.terminals.entries()) {
            if (term === terminal) {
                this.terminals.delete(key);
                break;
            }
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
        this.disposables.forEach(d => d.dispose());
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
            location?: vscode.ViewColumn | { viewColumn: vscode.ViewColumn };
        }
    ): Promise<vscode.Terminal | undefined> {
        try {
            // Check for existing terminal
            let terminal = this.findTerminal(cli);
            
            if (!terminal || terminal.exitStatus) {
                // Create new terminal
                const placement = options?.location ? 'new' : 'active';
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
        cli: CLIType
    ): Promise<void> {
        // Show terminal
        terminal.show();
        
        // Get CLI-specific delay
        const delay = this.configService.getCliDelay(cli, text.length);
        
        // Wait for initial delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Copy text to clipboard and paste
        await vscode.env.clipboard.writeText(text);
        await vscode.commands.executeCommand('workbench.action.terminal.paste');
        
        // Send Enter after delay
        await new Promise(resolve => setTimeout(resolve, delay));
        terminal.sendText('', true);
    }
}