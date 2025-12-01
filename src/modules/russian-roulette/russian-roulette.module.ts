import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { RussianRouletteCommand } from './commands/russian-roulette.command.js';

export class RussianRoulette extends IsabelleModule {
  readonly name = 'RussianRoulette';
  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Tristan',
        githubUsername: 'Ozraam',
      },
      {
        displayName: 'Maxence',
        githubUsername: 'MAXOUXAX',
      },
    ];
  }

  init(): void {
    this.registerCommands([new RussianRouletteCommand()]);
  }
}
