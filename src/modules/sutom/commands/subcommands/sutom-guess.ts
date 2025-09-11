import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { AttemptOutcome } from '@/modules/sutom/core/sutom-game.js';
import { CommandInteraction } from 'discord.js';

export default async function guessWordSubcommand(
  interaction: CommandInteraction,
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
      interaction.reply('Tu as déjà essayé ce mot !').catch((e: unknown) => {
        console.error(e);
      });
      break;
    case AttemptOutcome.WORD_LENGTH_MISMATCH:
      interaction
        .reply("Le mot que tu as proposé n'a pas la bonne longueur !")
        .catch((e: unknown) => {
          console.error(e);
        });
      break;
    case AttemptOutcome.GAME_FINISHED:
      await interaction
        .reply(
          `${game.renderHistory()}\nLa partie est déjà terminée ! Le mot était: ${game.word}`,
        )
        .catch((e: unknown) => {
          console.error(e);
        });
      sutomGameManager.deleteGame(user.id);
      break;
    case AttemptOutcome.ATTEMPTS_EXHAUSTED:
      await interaction
        .reply(
          `${game.renderHistory()}\nTu as utilisé toutes tes tentatives ! Le mot était: ${game.word}`,
        )
        .catch((e: unknown) => {
          console.error(e);
        });
      sutomGameManager.deleteGame(user.id);
      break;
    case AttemptOutcome.UNKNOWN_WORD:
      interaction
        .reply("Le mot que tu as proposé n'existe pas dans le dictionnaire !")
        .catch((e: unknown) => {
          console.error(e);
        });
      break;
    case AttemptOutcome.WORD_SUCCESSFULLY_GUESSED:
      await interaction
        .reply(
          `${game.renderHistory()}\nBravo, tu as trouvé le mot ! Le mot était: ` +
            game.word,
        )
        .catch((e: unknown) => {
          console.error(e);
        });
      sutomGameManager.deleteGame(user.id);
      break;
    default:
      interaction.reply('Erreur inconnue !').catch((e: unknown) => {
        console.error(e);
      });
      break;
  }
}
