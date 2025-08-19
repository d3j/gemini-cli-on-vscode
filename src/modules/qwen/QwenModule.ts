import { BaseCLIModule } from '../BaseCLIModule';
import { CLIType } from '../../types';

export class QwenModule extends BaseCLIModule {
    readonly cliType: CLIType = 'qwen';
    readonly displayName = 'Qwen CLI';
    readonly command = 'qwen-cli';
    readonly defaultDelay = 100;
}