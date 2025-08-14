import * as vscode from 'vscode';

export class ContextManager {
    private contextItems: ContextItem[] = [];

    async buildContext(): Promise<string | undefined> {
        const parts: string[] = [];

        // Add all open file paths
        const openDocuments = vscode.workspace.textDocuments;
        const filePaths = openDocuments
            .filter(doc => !doc.isUntitled && doc.uri.scheme === 'file')
            .map(doc => vscode.workspace.asRelativePath(doc.fileName));
        
        if (filePaths.length > 0) {
            parts.push('Open files:');
            parts.push(filePaths.join('\n'));
        }

        // Selection context removed - users will copy-paste specific code sections into prompt

        // Add custom context items
        for (const item of this.contextItems) {
            if (item.type === 'file') {
                parts.push(`File: ${item.path}`);
                if (item.content) {
                    parts.push('```');
                    parts.push(item.content);
                    parts.push('```');
                }
            } else if (item.type === 'text') {
                parts.push(item.content || '');
            }
        }

        return parts.length > 0 ? parts.join('\n') : undefined;
    }

    addFile(filePath: string, content?: string): void {
        this.contextItems.push({
            type: 'file',
            path: filePath,
            content
        });
    }

    addText(text: string): void {
        this.contextItems.push({
            type: 'text',
            content: text
        });
    }

    // addSelection() method removed - users will copy-paste directly into prompt

    clear(): void {
        this.contextItems = [];
    }

    getContextItems(): ContextItem[] {
        return [...this.contextItems];
    }

    async formatForPrompt(): Promise<string> {
        const context = await this.buildContext();
        return context || '';
    }
}

interface ContextItem {
    type: 'file' | 'text';
    path?: string;
    content?: string;
}
