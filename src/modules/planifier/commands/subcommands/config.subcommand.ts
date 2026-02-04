import { configManager } from '@/manager/config.manager.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';

/**
 * Handle the /planifier config subcommand.
 * Configures the forum channel for events.
 */
export async function handleConfigSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content:
        "Tu n'as pas les permissions nécessaires pour configurer ce module. (Gérer les salons)",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: 'Cette commande doit être utilisée dans un serveur.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const forumChannel = interaction.options.getChannel('forum', true);

  if (forumChannel.type !== ChannelType.GuildForum) {
    await interaction.reply({
      content: 'Le salon choisi doit être un salon forum.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const currentConfig = configManager.getGuild(guildId);
  await configManager.saveGuild(guildId, {
    ...currentConfig,
    PLANIFIER_FORUM_CHANNEL_ID: forumChannel.id,
  });

  await interaction.reply({
    content: `Le salon forum a été configuré : <#${forumChannel.id}>`,
    flags: MessageFlags.Ephemeral,
  });
}
