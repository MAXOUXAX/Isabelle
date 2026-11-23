import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { createLogger } from '@/utils/logger.js';
import { CommandInteraction, MessageFlags } from 'discord.js';

const logger = createLogger('sutom-stop');

export default async function stopSutomSubcommand(
  interaction: CommandInteraction,
): Promise<void> {
  const { user } = interaction;
  const { guildId } = interaction;

  if (!guildId) {
    await interaction.reply({
      content: 'Cette commande ne peut être utilisée que sur un serveur.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const game = sutomGameManager.getGame(guildId, user.id);
  if (!game) {
    await interaction.reply({
      content: `Tu n'as pas de partie en cours ! Utilise la commande /sutom start pour en commencer une.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const threadId = sutomGameManager.getGameThreadId(guildId, user.id);

  // Check if we're in the correct thread or main channel
  const { channel } = interaction;
  const isInCorrectThread = channel && threadId && channel.id === threadId;

  if (!isInCorrectThread) {
    const threadMention = threadId ? `<#${threadId}>` : 'ton thread de jeu';
    await interaction.reply({
      content: `Tu ne peux arrêter ta partie que dans ${threadMention} !`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const { embed, attachment } = game.buildBoard(
      `🛑 La partie est terminée ! Le mot était: **${game.word.toUpperCase()}**`,
    );

    await interaction.reply({ embeds: [embed], files: [attachment] });

    // Archive the thread
    if (channel.isThread()) {
      await channel.setArchived(true).catch((e: unknown) => {
        logger.error({ error: e }, 'Failed to archive thread');
      });
    }

    sutomGameManager.deleteGame(guildId, user.id);
  } catch (error) {
    logger.error({ error }, 'Error stopping game');
    await interaction.reply({
      content: "Une erreur est survenue lors de l'arrêt de ta partie.",
      ephemeral: true,
    });
  }
}
