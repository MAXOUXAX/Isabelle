import {
  AGENDA_EVENT_SELECT_ID,
  buildEventDetailMessage,
} from '@/modules/agenda/messages/agenda-list-message.js';
import { fetchUpcomingAgendaEvents } from '@/modules/agenda/services/agenda.service.js';
import {
  AgendaUserError,
  withAgendaErrorHandling,
} from '@/modules/agenda/utils/agenda-errors.js';
import { requireGuild } from '@/modules/agenda/utils/interaction-guards.js';
import { InteractionHandler } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import {
  Interaction,
  MessageFlags,
  StringSelectMenuInteraction,
} from 'discord.js';

const logger = createLogger('agenda-list-navigation');

export class AgendaListNavigationHandler implements InteractionHandler {
  customId = AGENDA_EVENT_SELECT_ID;

  async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isStringSelectMenu()) {
      return;
    }
    const handler = withAgendaErrorHandling(
      logger,
      async (menuInteraction: StringSelectMenuInteraction): Promise<void> => {
        const selectedEventId = menuInteraction.values[0];

        if (!selectedEventId) {
          logger.warn('No event selected in agenda dropdown');
          throw new AgendaUserError(
            'Aucun événement sélectionné. Utilise `/agenda list` pour voir les événements.',
          );
        }

        const { guild } = requireGuild(menuInteraction);

        if (!menuInteraction.deferred && !menuInteraction.replied) {
          await menuInteraction.deferUpdate();
        }

        const upcomingEvents = await fetchUpcomingAgendaEvents(guild.id);

        const selectedEvent = upcomingEvents.find(
          (event) => event.discordEventId === selectedEventId,
        );

        if (!selectedEvent) {
          await menuInteraction.followUp({
            content:
              "Cet événement n'existe plus ou a été annulé. Utilise `/agenda list` pour voir les événements disponibles.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const container = buildEventDetailMessage(
          selectedEvent,
          upcomingEvents,
        );

        await menuInteraction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      },
      'Impossible de récupérer les événements du serveur pour le moment. Réessaie dans quelques instants.',
      'followUp',
    );

    await handler(interaction);
  }
}
