import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export class HotPotatoCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('hot-potato')
    .setDescription('Gérer les paramètres relatifs à la patate chaude.');

  async executeCommand(interaction: CommandInteraction) {
    await interaction.reply({
      ephemeral: true,
      content: 'Commande en cours de développement.',
    });
  }
}
