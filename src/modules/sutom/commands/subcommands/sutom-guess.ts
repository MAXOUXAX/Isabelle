import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { AttemptOutcome } from '@/modules/sutom/core/sutom-game.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';

const logger = createLogger('sutom-guess');

export default async function guessWordSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const { user, channel } = interaction;
  const guessedWord = interaction.options.getString('mot');
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

  const gameChannel = channel as NonNullable<typeof channel>;

  // Additional validation: check if there's a game associated with this thread
  const threadGame = sutomGameManager.getGameByThreadId(gameChannel.id);
  if (!threadGame || threadGame.userId !== user.id) {
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

  const archiveThread = async () => {
    if (gameChannel.isThread()) {
      await gameChannel.setArchived(true).catch((e: unknown) => {
        logger.error({ error: e }, 'Failed to archive thread');
      });
    }
  };

  const replyWithBoard = async (message: string) => {
    const { embed, attachment } = game.buildBoard(message);
    await interaction.reply({ embeds: [embed], files: [attachment] });
  };

  const concludeGame = async (message: string) => {
    await replyWithBoard(message);
    await archiveThread();
    sutomGameManager.deleteGame(user.id);
  };

  const wordOutcome = game.addWord(guessedWord);

  switch (wordOutcome) {
    case AttemptOutcome.WORD_REPEATED:
      await sendEphemeral('Tu as déjà essayé ce mot !');
      break;
    case AttemptOutcome.WORD_LENGTH_MISMATCH:
      await sendEphemeral(
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
      await sendEphemeral(
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
      await sendEphemeral('Erreur inconnue !');
      break;
  }
}
