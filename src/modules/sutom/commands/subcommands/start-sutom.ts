import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  ForumChannel,
  NewsChannel,
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
        ephemeral: true,
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
        ephemeral: true,
      })
      .catch((e: unknown) => {
        console.error(e);
      });
    return;
  }

  // Check if the channel supports threads
  if (
    !(
      channel instanceof TextChannel ||
      channel instanceof NewsChannel ||
      channel instanceof ForumChannel
    )
  ) {
    await interaction
      .reply({
        content: 'Les threads ne sont pas supportés dans ce type de canal.',
        ephemeral: true,
      })
      .catch((e: unknown) => {
        console.error(e);
      });
    return;
  }

  try {
    // Create a thread for the game
    const thread = await channel.threads.create({
      name: `🎯 SUTOM - ${user.displayName}`,
      type: ChannelType.PrivateThread,
      reason: `Partie SUTOM privée pour ${user.displayName}`,
    });

    // Add the user to the thread
    await thread.members.add(user.id);

    // Create the game with the thread ID
    const isNewGame = sutomGameManager.createGame(user.id, thread.id);
    if (!isNewGame) {
      // This shouldn't happen since we checked above, but handle it gracefully
      await thread.delete();
      await interaction
        .reply({
          content: 'Une erreur est survenue lors de la création de ta partie.',
          ephemeral: true,
        })
        .catch((e: unknown) => {
          console.error(e);
        });
      return;
    }

    const game = sutomGameManager.getGame(user.id);
    if (game) {
      const { embed, attachment } = game.buildBoard();

      // Reply to the original interaction with a link to the thread
      await interaction
        .reply({
          content: `🎉 Ta partie SUTOM a été créée dans ${thread.toString()}!\nOn cherche un mot de **${String(game.word.length)} lettres**.`,
          ephemeral: true,
        })
        .catch((e: unknown) => {
          console.error(e);
        });

      // Send the game board in the thread
      await thread
        .send({
          content: `Bienvenue dans ta partie SUTOM privée, ${user.toString()}! 🎯\nOn cherche un mot de **${String(game.word.length)} lettres**.\n\nUtilise \`/sutom mot\` pour proposer tes mots.`,
          embeds: [embed],
          files: [attachment],
        })
        .catch((e: unknown) => {
          logger.error(e);
        });
    } else {
      await thread.delete();
      await interaction
        .reply({
          content:
            'Mince alors, une erreur est survenue lors de la création de ta partie.',
          ephemeral: true,
        })
        .catch((e: unknown) => {
          logger.error(e);
        });
    }
  } catch (error) {
    console.error('[SUTOM] Error creating thread:', error);
    await interaction
      .reply({
        content:
          "Impossible de créer un thread pour ta partie. Vérifie que j'ai les permissions nécessaires.",
        ephemeral: true,
      })
      .catch((e: unknown) => {
        console.error(e);
      });
  }
}
