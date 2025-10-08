import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  TextChannel,
} from 'discord.js';

const logger = createLogger('sutom-start');

export default async function startSutomSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const { user } = interaction;

  // Check if user already has a game
  const existingGame = sutomGameManager.getGame(user.id);
  if (existingGame) {
    const threadId = sutomGameManager.getGameThreadId(user.id);
    const threadMention = threadId ? `<#${threadId}>` : 'ton thread de jeu';
    await interaction
      .reply({
        content: `Oups, on dirait que tu as déjà une partie en cours ! Propose un mot dans ${threadMention}.`,
        flags: MessageFlags.Ephemeral,
      })
      .catch((e: unknown) => {
        logger.error(e);
      });
    return;
  }

  const { channel } = interaction;
  if (!channel?.isSendable()) {
    await interaction
      .reply({
        content: 'Impossible de créer une partie dans ce canal.',
        flags: MessageFlags.Ephemeral,
      })
      .catch((e: unknown) => {
        logger.error(e);
      });
    return;
  }

  // Check if the channel supports threads
  if (!(channel instanceof TextChannel)) {
    await interaction
      .reply({
        content:
          'Tu ne peux pas jouer dans ce canal, essaye un autre canal textuel.',
        flags: MessageFlags.Ephemeral,
      })
      .catch((e: unknown) => {
        logger.error(e);
      });
    return;
  }

  try {
    // We'll defer the reply to later delete it
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Create a thread for the game
    const thread = await channel.threads.create({
      name: `🎯 SUTOM - ${user.displayName}`,
      type: ChannelType.PublicThread,
      reason: `Partie SUTOM pour ${user.displayName}`,
    });

    // Create the game with the thread ID
    const gameCreated = sutomGameManager.createGame(user.id, thread.id);
    if (!gameCreated) {
      // Should never happen, but handle it gracefully
      await thread.delete();
      await interaction
        .editReply({
          content: 'Une erreur est survenue lors de la création de ta partie.',
        })
        .catch((e: unknown) => {
          logger.error(e);
        });
      return;
    }

    const game = sutomGameManager.getGame(user.id);
    if (game) {
      const { embed, attachment } = game.buildBoard();

      // Send the game board in the thread as the first message
      await thread
        .send({
          content: `Bienvenue dans ta partie de SUTOM, ${user.toString()}! 🎯\nOn cherche un mot de **${String(game.word.length)} lettres**.\n\nUtilise \`/sutom mot\` pour proposer tes mots.`,
          embeds: [embed],
          files: [attachment],
        })
        .catch((e: unknown) => {
          logger.error(e);
        });

      // Delete the deferred reply - Discord's automated message is enough
      await interaction.deleteReply().catch((e: unknown) => {
        logger.error(e);
      });
    } else {
      await thread.delete();
      await interaction
        .editReply({
          content:
            'Mince alors, une erreur est survenue lors de la création de ta partie.',
        })
        .catch((e: unknown) => {
          logger.error(e);
        });
    }
  } catch (error) {
    logger.error({ error }, 'Error creating thread');
    await interaction
      .editReply({
        content:
          "Impossible de créer un thread pour ta partie. Vérifie que j'ai les permissions nécessaires.",
      })
      .catch((e: unknown) => {
        logger.error(e);
      });
  }
}
