import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { sutomGameManager } from '@/modules/sutom/core/GameManager.js';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export class StartSutomCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('stop-sutom')
    .setDescription('Arrête ta partie de sutom !');

  public async executeCommand(interaction: CommandInteraction): Promise<void> {
    const { user } = interaction;

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

    const { channel } = interaction;
    if (channel?.isSendable()) {
      await interaction
        .reply(
          `${game.renderHistory()}\nLa partie est terminée ! Le mot était: ${game.word}`,
        )
        .catch((e: unknown) => {
          console.error(e);
        });
      sutomGameManager.deleteGame(user.id);
    }
  }
}
