import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { PlanifierCommand } from './commands/planifier.command.js';
import { PlanifierListNavigationHandler } from './interactions/planifier-list-navigation.interaction.js';
import { handlePlanifierModalSubmit } from './interactions/planifier-modal-submit.interaction.js';

export class PlanifierModule extends IsabelleModule {
  readonly name = 'planifier';
  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Maxence',
        githubUsername: 'MAXOUXAX',
      },
    ];
  }

  init(): void {
    this.registerCommands([new PlanifierCommand()]);

    this.registerInteractionHandlers([
      {
        customId: 'planifier-modal',
        handle: handlePlanifierModalSubmit.bind(this),
      },
      new PlanifierListNavigationHandler(),
    ]);
  }
}
