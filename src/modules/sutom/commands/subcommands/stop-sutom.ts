import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { createLogger } from '@/utils/logger.js';
import {
  chatInputApplicationCommandMention,
  CommandInteraction,
} from 'discord.js';

const logger = createLogger('sutom-stop');

export default async function stopSutomSubcommand(
  interaction: CommandInteraction,
): Promise<void> {
  const { user } = interaction;

  const game = sutomGameManager.getGame(user.id);
  if (!game) {
    await interaction
      .reply({
        content: `Tu n'as pas de partie en cours ! Utilise la commande ${chatInputApplicationCommandMention('sutom', 'start', '0')} pour en commencer une.`,
        ephemeral: true,
      })
      .catch((e: unknown) => {
        logger.error(e);
      });
    return;
  }

  const threadId = sutomGameManager.getGameThreadId(user.id);

  // Check if we're in the correct thread or main channel
  const { channel } = interaction;
  const isInCorrectThread = channel && threadId && channel.id === threadId;

  if (!isInCorrectThread) {
    const threadMention = threadId ? `<#${threadId}>` : 'ton thread de jeu';
    await interaction
      .reply({
        content: `Tu ne peux arrêter ta partie que dans ${threadMention}!`,
        ephemeral: true,
      })
      .catch((e: unknown) => {
        logger.error(e);
      });
    return;
  }

  try {
    const { embed, attachment } = game.buildBoard(
      `🛑 La partie est terminée ! Le mot était: **${game.word.toUpperCase()}**`,
    );

    await interaction
      .reply({ embeds: [embed], files: [attachment] })
      .catch((e: unknown) => {
        logger.error(e);
      });

    // Archive the thread
    if (channel.isThread()) {
      await channel.setArchived(true).catch((e: unknown) => {
        logger.error({ error: e }, 'Failed to archive thread');
      });
    }

    sutomGameManager.deleteGame(user.id);
  } catch (error) {
    logger.error({ error }, 'Error stopping game');
    await interaction
      .reply({
        content: "Une erreur est survenue lors de l'arrêt de ta partie.",
        ephemeral: true,
      })
      .catch((e: unknown) => {
        logger.error(e);
      });
  }
}
