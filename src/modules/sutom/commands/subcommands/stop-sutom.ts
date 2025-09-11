import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { CommandInteraction } from 'discord.js';

export default async function stopSutomSubcommand(
  interaction: CommandInteraction,
): Promise<void> {
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
