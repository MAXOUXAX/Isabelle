import { client } from '@/index.js';
import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { AttemptOutcome, SutomGame } from '@/modules/sutom/core/sutom-game.js';
import { createLogger } from '@/utils/logger.js';
import {
  AnyThreadChannel,
  AttachmentBuilder,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';

const logger = createLogger('sutom-guess-handler');

/**
 * Interface for sending messages back to the user.
 * Different implementations for slash command (ephemeral) vs message reply.
 */
export interface GuessResponder {
  sendError(message: string): Promise<void>;
  sendBoard(embed: EmbedBuilder, attachment: AttachmentBuilder): Promise<void>;
}

export interface GuessContext {
  userId: string;
  game: SutomGame;
  thread: AnyThreadChannel;
  responder: GuessResponder;
}

/**
 * Archives the thread, handling errors gracefully.
 */
async function archiveThread(thread: AnyThreadChannel): Promise<void> {
  await thread.setArchived(true).catch((e: unknown) => {
    logger.error({ error: e }, 'Failed to archive thread');
  });
}

/**
 * Updates the hidden board message in the parent channel for daily games.
 */
async function updateParentChannelBoard(
  context: GuessContext,
  message: string,
  isGameOver: boolean,
): Promise<void> {
  const { userId, game } = context;

  // Only update for daily games
  if (!game.isDailyGame) return;

  const parentChannelId = sutomGameManager.getParentChannelId(userId);
  const parentMessageId = sutomGameManager.getParentMessageId(userId);

  if (!parentChannelId || !parentMessageId) {
    logger.warn({ userId }, 'Daily game missing parent channel or message ID');
    return;
  }

  try {
    const parentChannel = await client.channels.fetch(parentChannelId);
    if (!parentChannel || !(parentChannel instanceof TextChannel)) {
      logger.warn({ parentChannelId }, 'Could not fetch parent channel');
      return;
    }

    const parentMessage = await parentChannel.messages.fetch(parentMessageId);

    const user = await client.users.fetch(userId);
    const displayMessage = isGameOver
      ? `${user.toString()} a terminé le mot du jour ! ${message}`
      : `${user.toString()} joue le mot du jour !`;

    const { embed, attachment } = game.buildBoard(displayMessage, {
      hideLetters: true,
    });

    await parentMessage.edit({
      embeds: [embed],
      files: [attachment],
    });
  } catch (error) {
    logger.error({ error }, 'Failed to update parent channel board');
  }
}

/**
 * Concludes the game by displaying the board, archiving the thread, and deleting the game.
 */
async function concludeGame(
  context: GuessContext,
  boardMessage: string,
  publicMessage: string,
): Promise<void> {
  const { embed, attachment } = context.game.buildBoard(boardMessage);
  await context.responder.sendBoard(embed, attachment);

  // Update the parent channel with hidden board (for daily games)
  await updateParentChannelBoard(context, publicMessage, true);

  await archiveThread(context.thread);
  sutomGameManager.deleteGame(context.userId);
}

/**
 * Handles a word guess attempt and sends appropriate responses.
 * Returns true if the guess was processed, false if it should be ignored.
 */
export async function handleGuessAttempt(
  context: GuessContext,
  guessedWord: string,
): Promise<boolean> {
  const { game, responder } = context;

  const wordOutcome = game.addWord(guessedWord);

  switch (wordOutcome) {
    case AttemptOutcome.WORD_REPEATED:
      await responder.sendError('Tu as déjà essayé ce mot !');
      return true;

    case AttemptOutcome.WORD_LENGTH_MISMATCH:
      await responder.sendError(
        "Le mot que tu as proposé n'a pas la bonne longueur !",
      );
      return true;

    case AttemptOutcome.ATTEMPTS_EXHAUSTED:
      await concludeGame(
        context,
        `❌ Tu as utilisé toutes tes tentatives ! Le mot était: **${game.word.toUpperCase()}**`,
        '❌ Perdu !',
      );
      return true;

    case AttemptOutcome.UNKNOWN_WORD:
      await responder.sendError(
        "Le mot que tu as proposé n'existe pas dans le dictionnaire !",
      );
      return true;

    case AttemptOutcome.WORD_SUCCESSFULLY_GUESSED:
      await concludeGame(
        context,
        `🎉 Bravo, tu as trouvé le mot: **${game.word.toUpperCase()}**`,
        '🎉 Gagné !',
      );
      return true;

    case AttemptOutcome.VALID_WORD: {
      const remaining = game.getRemainingAttempts();
      const { embed, attachment } = game.buildBoard(
        `Il te reste **${String(remaining)}** tentative${remaining > 1 ? 's' : ''}.`,
      );
      await responder.sendBoard(embed, attachment);

      // Update the parent channel with hidden board (for daily games)
      await updateParentChannelBoard(context, '', false);

      return true;
    }

    default:
      return false;
  }
}
