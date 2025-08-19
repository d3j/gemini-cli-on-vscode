import { BaseCLIModule } from '../BaseCLIModule';
import { CLIType } from '../../types';

export class GeminiModule extends BaseCLIModule {
    readonly cliType: CLIType = 'gemini';
    readonly displayName = 'Gemini CLI';
    readonly command = 'gemini-cli';
    readonly defaultDelay = 100;
}