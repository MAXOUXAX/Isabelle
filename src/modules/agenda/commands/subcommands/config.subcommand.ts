import { configManager } from '@/manager/config.manager.js';
import {
  AgendaUserError,
  withAgendaErrorHandling,
} from '@/modules/agenda/utils/agenda-errors.js';
import {
  requireGuild,
  requirePermission,
} from '@/modules/agenda/utils/interaction-guards.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';

const logger = createLogger('agenda-config');

/**
 * Handle the /agenda config subcommand.
 * Configures the forum channel for events.
 */
export const handleConfigSubcommand = withAgendaErrorHandling(
  logger,
  async (interaction: ChatInputCommandInteraction): Promise<void> => {
    requirePermission(
      interaction,
      PermissionFlagsBits.ManageChannels,
      "Tu n'as pas les permissions nécessaires pour configurer ce module. (Gérer les salons)",
    );

    const { guildId } = requireGuild(interaction);

    const forumChannel = interaction.options.getChannel('forum');
    const roleToMention = interaction.options.getRole('role');

    if (!forumChannel && !roleToMention) {
      throw new AgendaUserError(
        'Tu dois fournir au moins un paramètre : un salon forum ou un rôle à mentionner.',
      );
    }

    if (forumChannel && forumChannel.type !== ChannelType.GuildForum) {
      throw new AgendaUserError('Le salon choisi doit être un salon forum.');
    }

    const currentConfig = configManager.getGuild(guildId);
    const updates: string[] = [];

    await interaction.deferReply({ ephemeral: true });

    await configManager.saveGuild(guildId, {
      ...currentConfig,
      AGENDA_FORUM_CHANNEL_ID:
        forumChannel?.id ?? currentConfig.AGENDA_FORUM_CHANNEL_ID,
      AGENDA_ROLE_TO_MENTION:
        roleToMention?.id ?? currentConfig.AGENDA_ROLE_TO_MENTION,
    });

    if (forumChannel) {
      updates.push(`Salon forum : <#${forumChannel.id}>`);
    }

    if (roleToMention) {
      updates.push(`Rôle à mentionner : <@&${roleToMention.id}>`);
    }

    await interaction.editReply({
      content: `Configuration mise à jour ✅\n${updates.join('\n')}`,
    });
  },
  'Impossible de mettre à jour la configuration pour le moment.',
);
