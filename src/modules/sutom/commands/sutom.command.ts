import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { sutomGameManager } from '@/modules/sutom/core/GameManager.js';
import { WordState } from '@/modules/sutom/core/SutomGame.js';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export class SutomCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('sutom')
    .setDescription(
      'Joue une partie de sutom ! Chaque joueur a sa propre instance de jeu.',
    )
    .addStringOption((option) =>
      option
        .setName('mot')
        .setDescription('Le mot à deviner')
        .setRequired(true),
    );

  public async executeCommand(interaction: CommandInteraction): Promise<void> {
    const { user } = interaction;

    console.log('[Sutom] Word to test:', interaction.options.get('mot'));

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

    const error = game.addWord(word.toLowerCase());
    if (!error) {
      interaction.reply(game.renderHistory()).catch((e: unknown) => {
        console.error(e);
      });
    } else {
      switch (error) {
        case WordState.ALREADY_TRIED:
          interaction
            .reply('Tu as déjà essayé ce mot !')
            .catch((e: unknown) => {
              console.error(e);
            });
          break;
        case WordState.LENGHT_NOT_CORRECT:
          interaction
            .reply("Le mot que tu as proposé n'a pas la bonne longueur !")
            .catch((e: unknown) => {
              console.error(e);
            });
          break;
        case WordState.GAME_FINISHED:
          await interaction
            .reply(
              `${game.renderHistory()}\nLa partie est déjà terminée ! Le mot était: ` +
                game.word,
            )
            .catch((e: unknown) => {
              console.error(e);
            });
          sutomGameManager.deleteGame(user.id);
          break;
        case WordState.NOT_IN_DICTIONARY:
          interaction
            .reply(
              "Le mot que tu as proposé n'existe pas dans le dictionnaire !",
            )
            .catch((e: unknown) => {
              console.error(e);
            });
          break;
        case WordState.GAME_WIN:
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
}
