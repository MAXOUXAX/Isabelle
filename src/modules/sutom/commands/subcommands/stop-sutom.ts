import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { CommandInteraction } from 'discord.js';
import { createLogger } from '@/utils/logger.js';

const logger = createLogger('sutom-stop');

export default async function stopSutomSubcommand(
  interaction: CommandInteraction,
): Promise<void> {
  const { user } = interaction;

  const game = sutomGameManager.getGame(user.id);
  if (!game) {
    await interaction
      .reply({
        content:
          "Tu n'as pas de partie en cours ! Utilise la commande /sutom start pour en commencer une.",
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
  const isInMainChannel = channel && (!threadId || channel.id !== threadId);

  if (!isInCorrectThread && !isInMainChannel) {
    const threadMention = threadId ? `<#${threadId}>` : 'ton thread de jeu';
    await interaction
      .reply({
        content: `Tu ne peux arrêter ta partie que dans ${threadMention} ou dans ce canal.`,
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

    // If we're in the thread, send the final board there
    if (isInCorrectThread) {
      await interaction
        .reply({ embeds: [embed], files: [attachment] })
        .catch((e: unknown) => {
          console.error(e);
        });

      // Archive the thread
      if (channel.isThread()) {
        await channel.setArchived(true).catch((e: unknown) => {
          console.error('[SUTOM] Failed to archive thread:', e);
        });
      }
    } else {
      // If we're in the main channel, just confirm the stop
      await interaction
        .reply({
          content: `🛑 Ta partie SUTOM a été arrêtée. Le mot était: **${game.word.toUpperCase()}**`,
          ephemeral: true,
        })
        .catch((e: unknown) => {
          console.error(e);
        });

      // Try to archive the thread if it exists
      if (threadId && interaction.guild) {
        try {
          const thread = await interaction.guild.channels.fetch(threadId);
          if (thread?.isThread()) {
            await thread.setArchived(true);
          }
        } catch (error) {
          console.error('[SUTOM] Failed to archive thread on stop:', error);
        }
      }
    }

    sutomGameManager.deleteGame(user.id);
  } catch (error) {
    console.error('[SUTOM] Error stopping game:', error);
    await interaction
      .reply({
        content: "Une erreur est survenue lors de l'arrêt de ta partie.",
        ephemeral: true,
      })
      .catch((e: unknown) => {
        console.error(e);
      });
  }
}
