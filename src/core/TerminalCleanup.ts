import * as vscode from 'vscode';

export class TerminalCleanup {
    static cleanupGhostTerminals(): void {
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
}