import { config } from '@/config.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { RoastCommand } from '@/modules/roast/command/roast.command.js';
import { createLogger } from '@/utils/logger.js';

const logger = createLogger('roast-module');

export class RoastModule extends IsabelleModule {
  readonly name = 'Roast';
  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Tanguy',
        githubUsername: 'TanguyFox',
      },
      {
        displayName: 'Maxence',
        githubUsername: 'MAXOUXAX',
      },
    ];
  }

  init(): void {
    if (!config.EXA_API_KEY) {
      logger.warn('EXA_API_KEY is not set: /roast will run without web search');
    }
    this.registerCommands([new RoastCommand()]);
  }
}
