import { buildEventsOverviewMessage } from '@/modules/agenda/messages/agenda-list-message.js';
import { fetchUpcomingAgendaEvents } from '@/modules/agenda/services/agenda.service.js';
import { withAgendaErrorHandling } from '@/modules/agenda/utils/agenda-errors.js';
import { requireGuild } from '@/modules/agenda/utils/interaction-guards.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';

const logger = createLogger('agenda-list');

/**
 * Handle the /agenda list subcommand.
 * Displays scheduled events with navigation.
 */
export const handleListSubcommand = withAgendaErrorHandling(
  logger,
  async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const { guildId } = requireGuild(interaction);

    await interaction.deferReply();

    const upcomingEvents = await fetchUpcomingAgendaEvents(guildId);
    const container = buildEventsOverviewMessage(upcomingEvents);

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
  'Impossible de récupérer les événements pour le moment. Réessaie dans quelques instants.',
  'edit',
);
