import { configManager } from '@/manager/config.manager.js';
import { buildAgendaModal } from '@/modules/agenda/messages/agenda-modal.js';
import { withAgendaErrorHandling } from '@/modules/agenda/utils/agenda-errors.js';
import {
  requireConfigValue,
  requireGuild,
} from '@/modules/agenda/utils/interaction-guards.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';

const logger = createLogger('agenda-create');

/**
 * Handle the /agenda create subcommand.
 * Shows a modal for event creation with optional AI enhancement.
 */
export const handleCreateSubcommand = withAgendaErrorHandling(
  logger,
  async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const { guildId } = requireGuild(interaction);

    const { AGENDA_FORUM_CHANNEL_ID, AGENDA_ROLE_TO_MENTION } =
      configManager.getGuild(guildId);
    requireConfigValue(
      AGENDA_ROLE_TO_MENTION,
      "Le rôle à mentionner n'est pas configuré. Utilise `/agenda config role:<rôle>` pour le définir.",
    );
    requireConfigValue(
      AGENDA_FORUM_CHANNEL_ID,
      "Le salon forum n'a pas été configuré. Utilise `/agenda config forum:<salon>` pour le configurer.",
    );

    const modal = buildAgendaModal({
      defaults: {
        aiOptions: ['enhance', 'emoji'],
      },
    });

    await interaction.showModal(modal);
  },
  "Impossible d'ouvrir le formulaire de création pour le moment.",
);
