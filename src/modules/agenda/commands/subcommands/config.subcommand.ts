import { configManager } from '@/manager/config.manager.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';

/**
 * Handle the /agenda config subcommand.
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

  const forumChannel = interaction.options.getChannel('forum');
  const fisaRole = interaction.options.getRole('role');

  if (!forumChannel && !fisaRole) {
    await interaction.reply({
      content:
        'Tu dois fournir au moins un paramètre : un salon forum ou un rôle FISA.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (forumChannel && forumChannel.type !== ChannelType.GuildForum) {
    await interaction.reply({
      content: 'Le salon choisi doit être un salon forum.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const currentConfig = configManager.getGuild(guildId);
  const updates: string[] = [];

  await configManager.saveGuild(guildId, {
    ...currentConfig,
    AGENDA_FORUM_CHANNEL_ID:
      forumChannel?.id ?? currentConfig.AGENDA_FORUM_CHANNEL_ID,
    AGENDA_FISA_ROLE_ID: fisaRole?.id ?? currentConfig.AGENDA_FISA_ROLE_ID,
  });

  if (forumChannel) {
    updates.push(`Salon forum : <#${forumChannel.id}>`);
  }

  if (fisaRole) {
    updates.push(`Rôle FISA : <@&${fisaRole.id}>`);
  }

  await interaction.reply({
    content: `Configuration mise à jour ✅\n${updates.join('\n')}`,
    flags: MessageFlags.Ephemeral,
  });
}
