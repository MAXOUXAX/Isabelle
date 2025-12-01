import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { AttemptOutcome } from '@/modules/sutom/core/sutom-game.js';
import { createLogger } from '@/utils/logger.js';
import { Message } from 'discord.js';

const logger = createLogger('sutom-message');

export async function sutomMessageListener(message: Message): Promise<void> {
  if (message.author.bot) return;

  if (!message.channel.isThread()) return;

  const threadGame = sutomGameManager.getGameByThreadId(message.channel.id);
  if (!threadGame) return;

  const { userId, game } = threadGame;

  if (message.author.id !== userId) {
    return;
  }

  const guessedWord = message.content.trim();

  if (!guessedWord || guessedWord.includes(' ')) {
    return;
  }

  logger.debug(
    `User ${message.author.username} (${message.author.id}) guessed word via message: "${guessedWord}"`,
  );

  const archiveThread = async () => {
    if (message.channel.isThread()) {
      await message.channel.setArchived(true).catch((e: unknown) => {
        logger.error({ error: e }, 'Failed to archive thread');
      });
    }
  };

  const replyWithBoard = async (boardMessage: string) => {
    const { embed, attachment } = game.buildBoard(boardMessage);
    await message.reply({ embeds: [embed], files: [attachment] });
  };

  const concludeGame = async (boardMessage: string) => {
    await replyWithBoard(boardMessage);
    await archiveThread();
    sutomGameManager.deleteGame(userId);
  };

  const wordOutcome = game.addWord(guessedWord);

  switch (wordOutcome) {
    case AttemptOutcome.WORD_REPEATED:
      await message.reply('Tu as déjà essayé ce mot !');
      break;
    case AttemptOutcome.WORD_LENGTH_MISMATCH:
      await message.reply(
        "Le mot que tu as proposé n'a pas la bonne longueur !",
      );
      break;
    case AttemptOutcome.ATTEMPTS_EXHAUSTED: {
      await concludeGame(
        `❌ Tu as utilisé toutes tes tentatives ! Le mot était: **${game.word.toUpperCase()}**`,
      );
      break;
    }
    case AttemptOutcome.UNKNOWN_WORD:
      await message.reply(
        "Le mot que tu as proposé n'existe pas dans le dictionnaire !",
      );
      break;
    case AttemptOutcome.WORD_SUCCESSFULLY_GUESSED: {
      await concludeGame(
        `🎉 Bravo, tu as trouvé le mot: **${game.word.toUpperCase()}**`,
      );
      break;
    }
    case AttemptOutcome.VALID_WORD: {
      const remaining = 6 - game.wordHistory.length;
      await replyWithBoard(
        `Il te reste **${String(remaining)}** tentative${remaining > 1 ? 's' : ''}.`,
      );
      break;
    }
    default:
      break;
  }
}
