import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '@/utils/logger.js';

export default function startSutomSubcommand(
  interaction: ChatInputCommandInteraction,
): void {
  const { user } = interaction;

  const isNewGame = sutomGameManager.createGame(user.id);
  if (!isNewGame) {
    interaction
      .reply(
        'Oups, on dirait que tu as déjà une partie en cours ! Propose un mot avec /sutom mot.',
      )
      .catch((e: unknown) => {
        logger.error(e);
      });
    return;
  }

  const { channel } = interaction;
  if (channel?.isSendable()) {
    const game = sutomGameManager.getGame(user.id);
    if (game) {
      const { embed, attachment } = game.buildBoard();
      interaction
        .reply({
          content: `Voilà une nouvelle partie, rien que pour toi ! 🎉\nOn cherche un mot de ${String(game.word.length)} lettres.`,
          embeds: [embed],
          files: [attachment],
        })
        .catch((e: unknown) => {
          logger.error(e);
        });
    } else {
      interaction
        .reply(
          'Mince alors, une erreur est survenue lors de la création de ta partie.',
        )
        .catch((e: unknown) => {
          logger.error(e);
        });
    }
  }
}
