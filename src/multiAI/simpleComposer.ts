import * as vscode from 'vscode';
import { FileHandler } from '../fileHandler';

export class SimpleComposer {
    constructor(private fileHandler: FileHandler) {}

    async openAndAsk(): Promise<void> {
        // Get prompt from user
        const prompt = await vscode.window.showInputBox({
            prompt: 'Enter your prompt for the AI agents',
            placeHolder: 'Type your question or prompt here...',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please enter a prompt';
                }
                return null;
            }
        });

        if (!prompt) {
            return; // User cancelled
        }

        // Select agents
        const agents = await this.selectAgents();
        if (!agents || agents.length === 0) {
            vscode.window.showWarningMessage('No agents selected. Please select at least one AI agent.');
            return;
        }

        // Broadcast to selected agents
        await this.fileHandler.broadcastToMultipleClis(prompt, agents);
    }

    async askWithDefaults(prompt: string, defaultAgents: ('gemini' | 'codex' | 'claude')[]): Promise<void> {
        if (!prompt || prompt.trim().length === 0) {
            vscode.window.showWarningMessage('Empty prompt provided');
            return;
        }

        await this.fileHandler.broadcastToMultipleClis(prompt, defaultAgents);
    }

    private async selectAgents(): Promise<('gemini' | 'codex' | 'claude')[] | undefined> {
        const items: vscode.QuickPickItem[] = [
            {
                label: 'Gemini',
                description: 'Google Gemini AI',
                picked: true
            },
            {
                label: 'Codex',
                description: 'OpenAI Codex',
                picked: true
            },
            {
                label: 'Claude',
                description: 'Anthropic Claude',
                picked: true
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: 'Select AI agents to send the prompt to',
            ignoreFocusOut: true
        });

        if (!selected || selected.length === 0) {
            return undefined;
        }

        // Map labels to agent IDs
        return selected.map(item => {
            switch (item.label) {
                case 'Gemini':
                    return 'gemini';
                case 'Codex':
                    return 'codex';
                case 'Claude':
                    return 'claude';
                default:
                    return 'gemini';
            }
        }) as ('gemini' | 'codex' | 'claude')[];
    }
}