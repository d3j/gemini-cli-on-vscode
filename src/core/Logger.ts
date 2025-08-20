import * as vscode from 'vscode';

/**
 * Centralized logging service for the extension
 */
export class Logger {
    private outputChannel: vscode.OutputChannel;
    private timers: Map<string, number> = new Map();
    private disposed: boolean = false;
    
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Gemini CLI on VSCode');
    }
    
    /**
     * Log an info message
     */
    info(message: string, data?: any): void {
        this.log('INFO', message, data);
    }
    
    /**
     * Log a warning message
     */
    warn(message: string, data?: any): void {
        this.log('WARN', message, data);
    }
    
    /**
     * Log an error message
     */
    error(message: string, data?: any): void {
        this.log('ERROR', message, data);
    }
    
    /**
     * Log a debug message
     */
    debug(message: string, data?: any): void {
        this.log('DEBUG', message, data);
    }
    
    /**
     * Show the output channel
     */
    show(): void {
        if (this.disposed) return;
        this.outputChannel.show(true);
    }
    
    /**
     * Clear the output channel
     */
    clear(): void {
        if (this.disposed) return;
        this.outputChannel.clear();
    }
    
    /**
     * Log extension activation
     */
    logActivation(version: string): void {
        this.info('Extension activated', { version });
    }
    
    /**
     * Log terminal creation
     */
    logTerminalCreation(cli: string, name: string): void {
        this.info('Terminal created', { cli, name });
    }
    
    /**
     * Log command execution
     */
    logCommandExecution(command: string, details?: any): void {
        this.info('Command executed', { command, ...details });
    }
    
    /**
     * Log configuration change
     */
    logConfigChange(key: string, newValue: any, oldValue: any): void {
        this.info('Configuration changed', { 
            key, 
            newValue, 
            oldValue 
        });
    }
    
    /**
     * Start a performance timer
     */
    startTimer(operation: string): () => void {
        const startTime = Date.now();
        this.timers.set(operation, startTime);
        this.debug(`${operation} started`);
        
        // Return a function to end the timer
        return () => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            this.timers.delete(operation);
            this.debug(`${operation} completed`, { duration: `${duration}ms` });
        };
    }
    
    /**
     * Internal log method
     */
    private log(level: string, message: string, data?: any): void {
        // Guard against logging after disposal
        if (this.disposed) {
            return;
        }
        
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (data !== null && data !== undefined) {
            if (data instanceof Error) {
                logMessage += ` - ${data.message}`;
                if (data.stack) {
                    logMessage += `\n${data.stack}`;
                }
            } else if (typeof data === 'object') {
                try {
                    logMessage += ` - ${JSON.stringify(data)}`;
                } catch {
                    logMessage += ` - [Object]`;
                }
            } else {
                logMessage += ` - ${data}`;
            }
        }
        
        try {
            this.outputChannel.appendLine(logMessage);
        } catch {
            // Silently ignore if channel is closed
            // This can happen during test teardown
        }
    }
    
    /**
     * Dispose of resources
     */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        try {
            this.outputChannel.dispose();
        } catch {
            // ignore
        }
    }
}
