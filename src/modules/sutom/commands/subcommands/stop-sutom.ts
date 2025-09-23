import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { CommandInteraction } from 'discord.js';
import { createLogger } from '@/utils/logger.js';

const logger = createLogger('sutom-stop');

export default async function stopSutomSubcommand(
  interaction: CommandInteraction,
): Promise<void> {
  const { user } = interaction;

  const game = sutomGameManager.getGame(user.id);
  if (!game) {
    interaction
      .reply(
        "Tu n'as pas de partie en cours ! Utilise la commande /sutom start pour en commencer une.",
      )
      .catch((e: unknown) => {
        logger.error(e);
      });
    return;
  }

  const { channel } = interaction;
  if (channel?.isSendable()) {
    const { embed, attachment } = game.buildBoard(
      `🛑 La partie est terminée ! Le mot était: **${game.word.toUpperCase()}**`,
    );
    await interaction
      .reply({ embeds: [embed], files: [attachment] })
      .catch((e: unknown) => {
        logger.error(e);
      });
    sutomGameManager.deleteGame(user.id);
  }
}
