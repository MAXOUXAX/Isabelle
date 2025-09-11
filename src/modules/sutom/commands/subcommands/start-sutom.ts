import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { CommandInteraction } from 'discord.js';

export default function startSutomSubcommand(
  interaction: CommandInteraction,
): void {
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

  const { channel } = interaction;
  if (channel?.isSendable()) {
    const game = sutomGameManager.getGame(user.id);
    interaction
      .reply({
        content: 'Une partie de Sutom a été créée pour toi !',
        embeds: game ? [game.buildEmbed()] : [],
      })
      .catch((e: unknown) => {
        console.error(e);
      });
  }
}
