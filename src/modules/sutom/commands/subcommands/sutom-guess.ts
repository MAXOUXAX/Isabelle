import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { AttemptOutcome } from '@/modules/sutom/core/sutom-game.js';
import { ChatInputCommandInteraction } from 'discord.js';

export default async function guessWordSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const { user } = interaction;
  console.debug('[Sutom] Word to test:', interaction.options.get('mot'));

  const game = sutomGameManager.getGame(user.id);
  if (!game) {
    interaction
      .reply(
        "Tu n'as pas de partie en cours ! Utilise la commande `/sutom start` pour en commencer une.",
      )
      .catch((e: unknown) => {
        console.error(e);
      });
    return;
  }

  const word = interaction.options.get('mot')?.value as string;

  const wordOutcome = game.addWord(word);

  switch (wordOutcome) {
    case AttemptOutcome.WORD_REPEATED:
      interaction
        .reply({
          content: 'Tu as déjà essayé ce mot !',
          ephemeral: game.isDailyWord,
        })
        .catch((e: unknown) => {
          console.error(e);
        });
      break;
    case AttemptOutcome.WORD_LENGTH_MISMATCH:
      interaction
        .reply({
          content: "Le mot que tu as proposé n'a pas la bonne longueur !",
          ephemeral: game.isDailyWord,
        })
        .catch((e: unknown) => {
          console.error(e);
        });
      break;
    case AttemptOutcome.ATTEMPTS_EXHAUSTED: {
      const { embed, attachment } = game.buildBoard(
        `❌ Tu as utilisé toutes tes tentatives ! Le mot était: **${game.word.toUpperCase()}**`,
      );
      await interaction
        .reply({
          embeds: [embed],
          files: [attachment],
          ephemeral: game.isDailyWord,
        })
        .catch((e: unknown) => {
          console.error(e);
        });
      sutomGameManager.deleteGame(user.id);
      break;
    }
    case AttemptOutcome.UNKNOWN_WORD:
      interaction
        .reply({
          content:
            "Le mot que tu as proposé n'existe pas dans le dictionnaire !",
          ephemeral: game.isDailyWord,
        })
        .catch((e: unknown) => {
          console.error(e);
        });
      break;
    case AttemptOutcome.WORD_SUCCESSFULLY_GUESSED: {
      const { embed, attachment } = game.buildBoard(
        `🎉 Bravo, tu as trouvé le mot: **${game.word.toUpperCase()}**`,
      );
      await interaction
        .reply({
          embeds: [embed],
          files: [attachment],
          ephemeral: game.isDailyWord,
        })
        .catch((e: unknown) => {
          console.error(e);
        });
      sutomGameManager.deleteGame(user.id);
      break;
    }
    case AttemptOutcome.VALID_WORD: {
      const remaining = 6 - game.wordHistory.length;
      const { embed, attachment } = game.buildBoard(
        `Il te reste **${remaining.toString()}** tentative${remaining > 1 ? 's' : ''}.`,
      );
      interaction
        .reply({
          embeds: [embed],
          files: [attachment],
          ephemeral: game.isDailyWord,
        })
        .catch((e: unknown) => {
          console.error(e);
        });
      break;
    }
    default:
      interaction
        .reply({
          content: 'Erreur inconnue !',
          ephemeral: game.isDailyWord,
        })
        .catch((e: unknown) => {
          console.error(e);
        });
      break;
  }
}
