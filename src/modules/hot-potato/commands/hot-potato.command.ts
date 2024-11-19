import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export class HotPotatoCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('hot-potato')
    .setDescription('Play a game of hot potato!');

  async executeCommand(interaction: CommandInteraction) {
    await interaction.reply('Hot potato!');
  }
}
