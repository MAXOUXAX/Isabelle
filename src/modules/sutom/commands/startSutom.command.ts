import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { sutomGameManager } from '@/modules/sutom/core/GameManager.js';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export class StartSutomCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('start-sutom')
    .setDescription(
      'Joue une partie de sutom ! Chaque joueur a sa propre instance de jeu.',
    );

  public executeCommand(interaction: CommandInteraction): void {
    const { user } = interaction;

    const isNewGame = sutomGameManager.createGame(user.id);
    if (!isNewGame) {
      interaction
        .reply('Tu as déjà une partie en cours !')
        .catch((e: unknown) => {
          console.error(e);
        });
      return;
    }

    const channel = interaction.channel;
    if (channel?.isSendable()) {
      interaction
        .reply(
          `Une partie de Sutom a été créée pour toi !\n${sutomGameManager.getGame(user.id)?.renderHistory() ?? ''}`,
        )
        .catch((e: unknown) => {
          console.error(e);
        });
    }
  }
}
