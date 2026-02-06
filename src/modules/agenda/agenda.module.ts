import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { AgendaCommand } from './commands/agenda.command.js';
import { AgendaListActionsHandler } from './interactions/agenda-list-actions.interaction.js';
import { AgendaListNavigationHandler } from './interactions/agenda-list-navigation.interaction.js';
import { handleAgendaModalSubmit } from './interactions/agenda-modal-submit.interaction.js';
import { startThreadManagementService } from './services/thread-management.service.js';

export class AgendaModule extends IsabelleModule {
  readonly name = 'agenda';
  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Maxence',
        githubUsername: 'MAXOUXAX',
      },
    ];
  }

  init(): void {
    this.registerCommands([new AgendaCommand()]);

    this.registerInteractionHandlers([
      {
        customId: 'agenda-modal',
        handle: handleAgendaModalSubmit.bind(this),
      },
      new AgendaListActionsHandler(),
      new AgendaListNavigationHandler(),
    ]);

    startThreadManagementService();
  }
}
