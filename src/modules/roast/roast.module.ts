import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { RoastCommand } from '@/modules/roast/command/roast.command.js';

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
    this.registerCommands([new RoastCommand()]);
  }
}
