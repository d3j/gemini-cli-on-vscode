import { BaseCLIModule } from '../BaseCLIModule';
import { CLIType } from '../../types';

export class ClaudeModule extends BaseCLIModule {
    readonly cliType: CLIType = 'claude';
    readonly displayName = 'Claude Code';
    readonly command = 'claude-code';
    readonly defaultDelay = 600;
}