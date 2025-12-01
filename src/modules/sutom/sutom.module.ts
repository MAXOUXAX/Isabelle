import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { SutomCommand } from '@/modules/sutom/commands/sutom.command.js';

export class SutomModule extends IsabelleModule {
  readonly name = 'Sutom';
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
    this.registerCommands([new SutomCommand()]);
  }
}
