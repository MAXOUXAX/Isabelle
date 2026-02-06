import { db } from '@/db/index.js';
import { agendaEvents } from '@/db/schema.js';
import { InteractionHandler } from '@/modules/bot-module.js';
import {
  buildEventDetailMessage,
  PLANIFIER_EVENT_SELECT_ID,
} from '@/modules/planifier/messages/planifier-list-message.js';
import { createLogger } from '@/utils/logger.js';
import { Interaction, MessageFlags } from 'discord.js';
import { and, eq, gte } from 'drizzle-orm';

const logger = createLogger('planifier-list-navigation');

export class PlanifierListNavigationHandler implements InteractionHandler {
  customId = PLANIFIER_EVENT_SELECT_ID;

  async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isStringSelectMenu()) {
      return;
    }

    const selectedEventId = interaction.values[0];

    if (!selectedEventId) {
      logger.warn('No event selected in planifier dropdown');
      await interaction.reply({
        content:
          'Aucun événement sélectionné. Utilise `/planifier list` pour voir les événements.',
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
      const now = new Date();
      const upcomingEvents = await db
        .select()
        .from(agendaEvents)
        .where(
          and(
            eq(agendaEvents.guildId, interaction.guild.id),
            gte(agendaEvents.eventEndTime, now),
          ),
        )
        .orderBy(agendaEvents.eventStartTime);

      const selectedEvent = upcomingEvents.find(
        (event) => event.discordEventId === selectedEventId,
      );

      if (!selectedEvent) {
        await interaction.followUp({
          content:
            "Cet événement n'existe plus ou a été annulé. Utilise `/planifier list` pour voir les événements disponibles.",
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
