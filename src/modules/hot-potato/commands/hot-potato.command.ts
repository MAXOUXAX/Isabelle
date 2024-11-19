import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export class HotPotatoCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder = new SlashCommandBuilder()
    .setDescription("I don't want it!")
    .setName('hot-potato');

  async executeCommand(interaction: CommandInteraction) {
    await interaction.reply('Hot potato!');
  }
}
