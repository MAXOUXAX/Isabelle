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

    const { AGENDA_FISA_ROLE_ID } = configManager.getGuild(guildId);
    requireConfigValue(
      AGENDA_FISA_ROLE_ID,
      "Le rôle FISA n'est pas configuré. Utilise `/agenda config role:<rôle>` pour le définir.",
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
