import { sutomGameManager } from "@/modules/sutom/core/GameManager.js";
import { CommandInteraction } from "discord.js";

export default function startSutomSubcommand(interaction: CommandInteraction): void {
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
        interaction
            .reply(
                `Une partie de Sutom a été créée pour toi !\n${sutomGameManager.getGame(user.id)?.renderHistory() ?? ''}`,
            )
            .catch((e: unknown) => {
                console.error(e);
            });
    }
}