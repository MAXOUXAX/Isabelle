import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { IsabelleCommand } from '../../../manager/commands/command.interface.js';

export class Ping implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');

  public async executeCommand(interaction: CommandInteraction) {
    await interaction.reply('Pong!');
  }
}
