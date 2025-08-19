import * as vscode from 'vscode';
import { CLIType } from '../types';

export interface ICLIModule {
    readonly cliType: CLIType;
    readonly displayName: string;
    readonly command: string;
    readonly defaultDelay: number;
    
    isEnabled(): boolean;
    
    start(inActivePane: boolean): Promise<vscode.Terminal | undefined>;
    
    sendSelectedText(): Promise<void>;
    
    sendOpenFiles(): Promise<void>;
    
    sendFilePath(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void>;
    
    registerCommands(context: vscode.ExtensionContext): void;
    
    dispose(): void;
}

export interface ICLIModuleConfig {
    configService: any;
    terminalManager: any;
    fileHandler: any;
    commandHandler: any;
    logger: any;
}