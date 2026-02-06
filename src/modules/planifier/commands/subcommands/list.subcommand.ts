import { buildEventsOverviewMessage } from '@/modules/planifier/messages/planifier-list-message.js';
import { fetchUpcomingAgendaEvents } from '@/modules/planifier/services/agenda.service.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';

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
    const upcomingEvents = await fetchUpcomingAgendaEvents(interaction.guildId);

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
