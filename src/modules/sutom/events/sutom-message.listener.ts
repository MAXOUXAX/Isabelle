import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import {
  GuessResponder,
  handleGuessAttempt,
} from '@/modules/sutom/core/guess-handler.js';
import { createLogger } from '@/utils/logger.js';
import { AttachmentBuilder, EmbedBuilder, Message } from 'discord.js';

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

  const responder: GuessResponder = {
    sendError: async (content: string) => {
      await message.reply(content);
    },
    sendBoard: async (embed: EmbedBuilder, attachment: AttachmentBuilder) => {
      await message.reply({ embeds: [embed], files: [attachment] });
    },
  };

  await handleGuessAttempt(
    { userId, game, thread: message.channel, responder },
    guessedWord,
  );
}
