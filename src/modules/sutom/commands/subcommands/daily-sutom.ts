import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  TextChannel,
} from 'discord.js';

const logger = createLogger('sutom-daily');

export default async function dailySutomSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const { user } = interaction;

  // Check if user already has a game
  const existingGame = sutomGameManager.getGame(user.id);
  if (existingGame) {
    const threadId = sutomGameManager.getGameThreadId(user.id);
    const threadMention = threadId ? `<#${threadId}>` : 'ton thread de jeu';
    await interaction.reply({
      content: `Oups, on dirait que tu as déjà une partie en cours ! Propose un mot dans ${threadMention}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { channel } = interaction;

  // Check if the channel supports threads
  if (!(channel instanceof TextChannel)) {
    await interaction.reply({
      content:
        'Tu ne peux pas jouer dans ce canal, essaye un autre canal textuel.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    // Defer the reply to provide immediate feedback while the thread is being created
    await interaction.deferReply();

    // Create a PRIVATE thread for the daily game
    const thread = await channel.threads.create({
      name: `🎯 SUTOM Mot du jour - ${user.displayName}`,
      type: ChannelType.PrivateThread,
      reason: `Partie SUTOM mot du jour pour ${user.displayName}`,
    });

    // Create the daily game with parent channel tracking
    const gameCreated = sutomGameManager.createDailyGame(
      user.id,
      thread.id,
      channel.id,
    );
    if (!gameCreated) {
      await thread.delete();
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la création de ta partie.',
      });
      return;
    }

    const game = sutomGameManager.getGame(user.id);
    if (game) {
      const { embed, attachment } = game.buildBoard();

      // Send the game board in the private thread as the first message
      await thread.send({
        content: `Bienvenue dans ta partie du **mot du jour**, ${user.toString()}! 🎯\nOn cherche un mot de **${String(game.word.length)} lettres**.\n\nEnvoie tes propositions de mots directement dans ce thread !\n\n⚠️ C'est un thread privé, seul toi peux voir tes tentatives.`,
        embeds: [embed],
        files: [attachment],
      });

      // Send the HIDDEN board in the reply to the command for others to see progress
      const { embed: hiddenEmbed, attachment: hiddenAttachment } =
        game.buildBoard(`${user.toString()} joue le mot du jour !`, {
          hideLetters: true,
        });

      const replyMessage = await interaction.editReply({
        embeds: [hiddenEmbed],
        files: [hiddenAttachment],
      });

      // Store the message ID for later updates
      sutomGameManager.setParentMessageId(user.id, replyMessage.id);
    } else {
      await thread.delete();
      await interaction.editReply({
        content:
          'Mince alors, une erreur est survenue lors de la création de ta partie.',
      });
    }
  } catch (error) {
    logger.error({ error }, 'Error creating private thread for daily game');
    await interaction.editReply({
      content:
        "Impossible de créer un thread privé pour ta partie. Vérifie que j'ai les permissions nécessaires.",
    });
  }
}
