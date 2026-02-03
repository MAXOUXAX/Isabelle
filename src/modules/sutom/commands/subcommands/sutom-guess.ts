import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import {
  GuessResponder,
  handleGuessAttempt,
} from '@/modules/sutom/core/guess-handler.js';
import { createLogger } from '@/utils/logger.js';
import {
  AnyThreadChannel,
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';

const logger = createLogger('sutom-guess');

export default async function guessWordSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const { user, channel } = interaction;
  const guessedWord = interaction.options.getString('tentative');
  if (!guessedWord) {
    await interaction.reply('Tu dois fournir un mot à deviner !');
    return;
  }

  logger.debug(
    `User ${user.username} (${user.id}) guessed word: "${guessedWord}"`,
  );

  const game = sutomGameManager.getGame(user.id);
  if (!game) {
    await interaction.reply({
      content:
        "Tu n'as pas de partie en cours ! Utilise la commande `/sutom start` pour en commencer une.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sendEphemeral = (content: string) =>
    interaction.reply({ content, flags: MessageFlags.Ephemeral });

  const userThreadId = sutomGameManager.getGameThreadId(user.id);

  // Check if the command is being used in the correct thread
  if (!channel || !userThreadId || channel.id !== userThreadId) {
    const threadMention = userThreadId
      ? `<#${userThreadId}>`
      : 'ton thread de jeu';
    await sendEphemeral(
      `❌ Tu ne peux proposer des mots que dans ${threadMention} !`,
    );
    return;
  }

  // Validate the channel is a thread
  if (!channel.isThread()) {
    await sendEphemeral('Ce canal ne correspond pas à un thread de jeu.');
    return;
  }

  const gameChannel = channel as AnyThreadChannel;

  // Additional validation: check if there's a game associated with this thread
  const threadGame = sutomGameManager.getGameByThreadId(gameChannel.id);
  if (threadGame?.userId !== user.id) {
    await sendEphemeral(
      'Ce thread ne correspond pas à ta partie actuelle.',
    ).catch((e: unknown) => {
      logger.error(
        { error: e },
        `Failed to reply to ${user.username} about missing game:`,
      );
    });
    return;
  }

  const responder: GuessResponder = {
    sendError: async (content: string) => {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    },
    sendBoard: async (embed: EmbedBuilder, attachment: AttachmentBuilder) => {
      await interaction.reply({ embeds: [embed], files: [attachment] });
    },
  };

  const handled = await handleGuessAttempt(
    { userId: user.id, game, thread: gameChannel, responder },
    guessedWord,
  );

  if (!handled) {
    await sendEphemeral('Erreur inconnue !');
  }
}
