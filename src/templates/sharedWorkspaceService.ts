import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class SharedWorkspaceService {
    constructor(private readonly workspaceRoot: string, private readonly sharedDirRel = '.magus-templates/shared') {}

    getSharedDirectory(): string {
        // Allow override via configuration (new key first, fallback to old)
        const cfg = vscode.workspace.getConfiguration('gemini-cli-vscode.templates');
        const newPath = cfg.get<string>('sources.shared.path');
        const oldPath = cfg.get<string>('shared.path');
        const cfgPath = (newPath || oldPath || this.sharedDirRel).trim();
        // Resolve relative against workspace root; absolute stays as-is
        const normalized = cfgPath.startsWith('./') ? cfgPath.substring(2) : cfgPath;
        return path.resolve(this.workspaceRoot, normalized);
    }

    listMarkdownFiles(): string[] {
        const dir = this.getSharedDirectory();
        if (!fs.existsSync(dir)) return [];
        const walk = (d: string): string[] => {
            const out: string[] = [];
            for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
                const p = path.join(d, entry.name);
                if (entry.isDirectory()) out.push(...walk(p));
                else if (entry.isFile() && p.toLowerCase().endsWith('.md')) out.push(p);
            }
            return out;
        };
        return walk(dir);
    }
}
