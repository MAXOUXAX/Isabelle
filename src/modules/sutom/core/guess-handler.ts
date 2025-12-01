import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { AttemptOutcome, SutomGame } from '@/modules/sutom/core/sutom-game.js';
import { createLogger } from '@/utils/logger.js';
import { AnyThreadChannel, AttachmentBuilder, EmbedBuilder } from 'discord.js';

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
 * Concludes the game by displaying the board, archiving the thread, and deleting the game.
 */
async function concludeGame(
  context: GuessContext,
  boardMessage: string,
): Promise<void> {
  const { embed, attachment } = context.game.buildBoard(boardMessage);
  await context.responder.sendBoard(embed, attachment);
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
      );
      return true;

    case AttemptOutcome.VALID_WORD: {
      const remaining = game.getRemainingAttempts();
      const { embed, attachment } = game.buildBoard(
        `Il te reste **${String(remaining)}** tentative${remaining > 1 ? 's' : ''}.`,
      );
      await responder.sendBoard(embed, attachment);
      return true;
    }

    default:
      return false;
  }
}
