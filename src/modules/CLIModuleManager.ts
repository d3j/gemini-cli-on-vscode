import * as vscode from 'vscode';
import { ICLIModule, ICLIModuleConfig } from './ICLIModule';
import { GeminiModule } from './gemini/GeminiModule';
import { CodexModule } from './codex/CodexModule';
import { ClaudeModule } from './claude/ClaudeModule';
import { QwenModule } from './qwen/QwenModule';
import { CLIType } from '../types';

export class CLIModuleManager {
    private modules: Map<CLIType, ICLIModule> = new Map();
    
    constructor(private config: ICLIModuleConfig) {
        this.initializeModules();
    }
    
    private initializeModules(): void {
        const moduleClasses = [
            GeminiModule,
            CodexModule,
            ClaudeModule,
            QwenModule
        ];
        
        moduleClasses.forEach(ModuleClass => {
            const module = new ModuleClass(this.config);
            this.modules.set(module.cliType, module);
        });
    }
    
    registerAllCommands(context: vscode.ExtensionContext): void {
        this.modules.forEach(module => {
            module.registerCommands(context);
        });
    }
    
    getModule(cliType: CLIType): ICLIModule | undefined {
        return this.modules.get(cliType);
    }
    
    getAllModules(): ICLIModule[] {
        return Array.from(this.modules.values());
    }
    
    dispose(): void {
        this.modules.forEach(module => module.dispose());
        this.modules.clear();
    }
}