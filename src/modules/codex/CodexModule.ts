import { BaseCLIModule } from '../BaseCLIModule';
import { CLIType } from '../../types';

export class CodexModule extends BaseCLIModule {
    readonly cliType: CLIType = 'codex';
    readonly displayName = 'Codex CLI';
    readonly command = 'gemini-cli';
    readonly defaultDelay = 100;
}