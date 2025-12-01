import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { LegalCommand } from '@/modules/legal/commands/legal.command.js';
import { ConsentInteractionHandler } from '@/modules/legal/interactions/consent.interaction.js';

export class LegalModule extends IsabelleModule {
  readonly name = 'Legal';
  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Maxence',
        githubUsername: 'MAXOUXAX',
      },
    ];
  }

  init(): void {
    this.registerCommands([new LegalCommand()]);
    this.registerInteractionHandlers([new ConsentInteractionHandler()]);
  }
}
