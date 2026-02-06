import { db } from '@/db/index.js';
import { agendaEvents } from '@/db/schema.js';
import { buildEventsOverviewMessage } from '@/modules/planifier/messages/planifier-list-message.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { and, eq, gte } from 'drizzle-orm';

const logger = createLogger('planifier-list');

/**
 * Handle the /planifier list subcommand.
 * Displays scheduled events with navigation.
 */
export async function handleListSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({
      content: 'Cette commande doit être utilisée dans un serveur.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const now = new Date();
    const upcomingEvents = await db
      .select()
      .from(agendaEvents)
      .where(
        and(
          eq(agendaEvents.guildId, interaction.guildId),
          gte(agendaEvents.eventEndTime, now),
        ),
      )
      .orderBy(agendaEvents.eventStartTime);

    const container = buildEventsOverviewMessage(upcomingEvents);

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch agenda events');
    await interaction.editReply({
      content:
        'Impossible de récupérer les événements pour le moment. Réessaie dans quelques instants.',
    });
  }
}
