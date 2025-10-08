import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { AttemptOutcome } from '@/modules/sutom/core/sutom-game.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';

const logger = createLogger('sutom-guess');

export default async function guessWordSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const { user, channel } = interaction;
  if (interaction.options.get('mot') === null) {
    await interaction.reply('Tu dois fournir un mot à deviner !');
    return;
  }

  const guessedWord = interaction.options.get('mot')?.value as string;
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

  const userThreadId = sutomGameManager.getGameThreadId(user.id);

  // Check if the command is being used in the correct thread
  if (!channel || !userThreadId || channel.id !== userThreadId) {
    const threadMention = userThreadId
      ? `<#${userThreadId}>`
      : 'ton thread de jeu';
    await interaction.reply({
      content: `❌ Tu ne peux proposer des mots que dans ${threadMention} !`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Additional validation: check if there's a game associated with this thread
  const threadGame = sutomGameManager.getGameByThreadId(channel.id);
  if (!threadGame || threadGame.userId !== user.id) {
    await interaction
      .reply({
        content: 'Ce thread ne correspond pas à ta partie actuelle.',
        flags: MessageFlags.Ephemeral,
      })
      .catch((e: unknown) => {
        logger.error(
          { error: e },
          `Failed to reply to ${user.username} about missing game:`,
        );
      });
    return;
  }

  const word = interaction.options.get('mot')?.value as string;
  const wordOutcome = game.addWord(word);

  switch (wordOutcome) {
    case AttemptOutcome.WORD_REPEATED:
      await interaction.reply({
        content: 'Tu as déjà essayé ce mot !',
        flags: MessageFlags.Ephemeral,
      });
      break;
    case AttemptOutcome.WORD_LENGTH_MISMATCH:
      await interaction.reply({
        content: "Le mot que tu as proposé n'a pas la bonne longueur !",
        flags: MessageFlags.Ephemeral,
      });
      break;
    case AttemptOutcome.ATTEMPTS_EXHAUSTED: {
      const { embed, attachment } = game.buildBoard(
        `❌ Tu as utilisé toutes tes tentatives ! Le mot était: **${game.word.toUpperCase()}**`,
      );
      await interaction.reply({ embeds: [embed], files: [attachment] });

      // Close the thread (archive it but don't lock it)
      if (channel.isThread()) {
        await channel.setArchived(true).catch((e: unknown) => {
          logger.error({ error: e }, 'Failed to archive thread');
        });
      }

      sutomGameManager.deleteGame(user.id);
      break;
    }
    case AttemptOutcome.UNKNOWN_WORD:
      await interaction.reply({
        content: "Le mot que tu as proposé n'existe pas dans le dictionnaire !",
        flags: MessageFlags.Ephemeral,
      });
      break;
    case AttemptOutcome.WORD_SUCCESSFULLY_GUESSED: {
      const { embed, attachment } = game.buildBoard(
        `🎉 Bravo, tu as trouvé le mot: **${game.word.toUpperCase()}**`,
      );
      await interaction.reply({ embeds: [embed], files: [attachment] });

      // Close the thread (archive it but don't lock it)
      if (channel.isThread()) {
        await channel.setArchived(true).catch((e: unknown) => {
          logger.error({ error: e }, 'Failed to archive thread');
        });
      }

      sutomGameManager.deleteGame(user.id);
      break;
    }
    case AttemptOutcome.VALID_WORD: {
      const remaining = 6 - game.wordHistory.length;
      const { embed, attachment } = game.buildBoard(
        `Il te reste **${String(remaining)}** tentative${remaining > 1 ? 's' : ''}.`,
      );
      await interaction.reply({ embeds: [embed], files: [attachment] });
      break;
    }
    default:
      await interaction.reply({
        content: 'Erreur inconnue !',
        flags: MessageFlags.Ephemeral,
      });
      break;
  }
}
