import { IsabelleModule } from '@/modules/bot-module.js';
import { LegalCommand } from '@/modules/legal/commands/legal.command.js';
import { ConsentInteractionHandler } from '@/modules/legal/interactions/consent.interaction.js';

export class LegalModule extends IsabelleModule {
  readonly name = 'Legal';

  init(): void {
    this.registerCommands([new LegalCommand()]);
    this.registerInteractionHandlers([new ConsentInteractionHandler()]);
  }
}
