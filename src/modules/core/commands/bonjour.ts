import { commandManager } from '@/manager/commands/command.manager.js';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { IsabelleCommand } from '../../../manager/commands/command.interface.js';

export class Bonjour implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('bonjour')
    .setDescription(
      "Salut, moi c'est Isabelle, cette commande permet de te dire bonjour!",
    );

  public async executeCommand(interaction: CommandInteraction): Promise<void> {
    const { user } = interaction;
    // Greet the user, explaining useful commands, and how the bot is useful.
    // Also show technical details about the bot.
    // Those data should be inside an embed, it should be quite short but still include details.
    // Use emojis when necessary to make information more interesting and readable.

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const promotedCommands = [
      commandManager.findByName('planifier'),
      commandManager.findByName('anniversaire'),
      commandManager.findByName('bonjour'),
    ].filter((command) => command !== undefined);

    // TODO: Create an embed with the promoted commands

    await interaction.reply({
      content: `Bonjour ${user.displayName}! 👋 Je suis Isabelle, un bot qui permet de te dire bonjour! 🤖`,
      ephemeral: true,
    });
  }
}
