import { sutomGameManager } from '@/modules/sutom/core/GameManager.js';
import { AttemptOutcome } from '@/modules/sutom/core/SutomGame.js';
import { CommandInteraction } from 'discord.js';

export default async function guessWordSubcommand(
  interaction: CommandInteraction,
): Promise<Promise<void>> {
  const { user } = interaction;
  console.debug('[Sutom] Word to test:', interaction.options.get('mot'));

  const game = sutomGameManager.getGame(user.id);
  if (!game) {
    interaction
      .reply(
        "Tu n'as pas de partie en cours ! Utilise la commande /start-sutom pour en commencer une.",
      )
      .catch((e: unknown) => {
        console.error(e);
      });
    return;
  }

  const word = interaction.options.get('mot')?.value as string;

  const wordOutcome = game.addWord(word.toLowerCase());
  if (!wordOutcome) {
    interaction.reply(game.renderHistory()).catch((e: unknown) => {
      console.error(e);
    });
  } else {
    switch (wordOutcome) {
      case AttemptOutcome.WORD_ALREADY_TRIED:
        interaction.reply('Tu as déjà essayé ce mot !').catch((e: unknown) => {
          console.error(e);
        });
        break;
      case AttemptOutcome.WORD_LENGHT_NOT_CORRECT:
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
      case AttemptOutcome.WORD_UNKNOWED:
        interaction
          .reply("Le mot que tu as proposé n'existe pas dans le dictionnaire !")
          .catch((e: unknown) => {
            console.error(e);
          });
        break;
      case AttemptOutcome.CORRECT_WORD_FOUND:
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
}
