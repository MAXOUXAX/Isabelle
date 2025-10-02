import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { ChatInputCommandInteraction } from 'discord.js';

export default function startDailySutomSubcommand(
  interaction: ChatInputCommandInteraction,
): void {
  const { user } = interaction;

  const isNewGame = sutomGameManager.createDailyGame(user.id);
  if (!isNewGame) {
    interaction
      .reply({
        content:
          'Oups, on dirait que tu as déjà une partie en cours ! Propose un mot avec /sutom mot.',
        ephemeral: true,
      })
      .catch((e: unknown) => {
        console.error(e);
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
          content: `🌟 Voilà le mot du jour ! Bonne chance ! 🎉\nOn cherche un mot de ${String(game.word.length)} lettres.\n\n⚠️ *Cette partie est privée pour éviter de révéler le mot du jour aux autres joueurs.*`,
          embeds: [embed],
          files: [attachment],
          ephemeral: true,
        })
        .catch((e: unknown) => {
          console.error(e);
        });
    } else {
      interaction
        .reply({
          content:
            'Mince alors, une erreur est survenue lors de la création de ta partie.',
          ephemeral: true,
        })
        .catch((e: unknown) => {
          console.error(e);
        });
    }
  }
}
