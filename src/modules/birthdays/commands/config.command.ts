import { configManager } from '@/manager/config.manager.js';
import { isBirthdayAdmin } from '@/modules/birthdays/birthday.permissions.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';

const logger = createLogger('birthday-config-command');

export async function handleConfigBirthdayCommand(
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'Cette commande ne peut être utilisée que sur un serveur.',
      ephemeral: true,
    });
    return;
  }

  if (!isBirthdayAdmin(interaction)) {
    await interaction.reply({
      content:
        "Tu n'as pas les permissions nécessaires pour configurer ce module. (Gérer le serveur)",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.options.getChannel('salon', true);

  if (
    channel.type !== ChannelType.GuildText &&
    channel.type !== ChannelType.GuildAnnouncement
  ) {
    await interaction.reply({
      content: 'Le salon choisi doit être un salon textuel.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  // Make sure Isabelle can actually post in the chosen channel, otherwise the
  // daily announcement would silently fail later on.
  const me = interaction.guild?.members.me;
  const targetChannel = interaction.guild?.channels.cache.get(channel.id);

  if (me && targetChannel) {
    const permissions = targetChannel.permissionsFor(me);
    if (
      !permissions.has(PermissionFlagsBits.ViewChannel) ||
      !permissions.has(PermissionFlagsBits.SendMessages)
    ) {
      await interaction.editReply(
        `Je n'ai pas la permission de voir et d'envoyer des messages dans <#${channel.id}>. Donne-moi ces accès puis relance la commande.`,
      );
      return;
    }
  }

  try {
    const currentConfig = configManager.getGuild(interaction.guildId);

    await configManager.saveGuild(interaction.guildId, {
      ...currentConfig,
      BIRTHDAY_CHANNEL_ID: channel.id,
    });

    await interaction.editReply(
      `Configuration mise à jour ✅\nLes anniversaires seront annoncés dans <#${channel.id}>.`,
    );
  } catch (error) {
    logger.error(
      { error, guildId: interaction.guildId, channelId: channel.id },
      'Une erreur est survenue lors de la configuration du salon des anniversaires',
    );
    await interaction.editReply(
      'Une erreur est survenue lors de la mise à jour de la configuration. Veuillez réessayer plus tard.',
    );
  }
}
