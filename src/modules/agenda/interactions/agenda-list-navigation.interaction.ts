import {
  AGENDA_EVENT_SELECT_ID,
  buildEventDetailMessage,
} from '@/modules/agenda/messages/agenda-list-message.js';
import { fetchUpcomingAgendaEvents } from '@/modules/agenda/services/agenda.service.js';
import { InteractionHandler } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import { Interaction, MessageFlags } from 'discord.js';

const logger = createLogger('agenda-list-navigation');

export class AgendaListNavigationHandler implements InteractionHandler {
  customId = AGENDA_EVENT_SELECT_ID;

  async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isStringSelectMenu()) {
      return;
    }

    const selectedEventId = interaction.values[0];

    if (!selectedEventId) {
      logger.warn('No event selected in agenda dropdown');
      await interaction.reply({
        content:
          'Aucun événement sélectionné. Utilise `/agenda list` pour voir les événements.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content: 'Cette interaction doit être utilisée dans un serveur.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }

    try {
      const upcomingEvents = await fetchUpcomingAgendaEvents(
        interaction.guild.id,
      );

      const selectedEvent = upcomingEvents.find(
        (event) => event.discordEventId === selectedEventId,
      );

      if (!selectedEvent) {
        await interaction.followUp({
          content:
            "Cet événement n'existe plus ou a été annulé. Utilise `/agenda list` pour voir les événements disponibles.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const container = buildEventDetailMessage(selectedEvent, upcomingEvents);

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch agenda events');
      await interaction.followUp({
        content:
          'Impossible de récupérer les événements du serveur pour le moment. Réessaie dans quelques instants.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }
}
