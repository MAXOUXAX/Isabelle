import { IsabelleModule } from '@/modules/bot-module.js';
import { PlanifierCommand } from './commands/planifier.command.js';
import { handlePlanifierModalSubmit } from './interactions/planifier-modal-submit.interaction.js';

export class PlanifierModule extends IsabelleModule {
  readonly name = 'planifier';

  init(): void {
    this.registerCommands([new PlanifierCommand()]);

    this.registerInteractionHandlers([
      {
        customId: 'planifier-modal',
        handle: handlePlanifierModalSubmit.bind(this),
      },
    ]);
  }
}
