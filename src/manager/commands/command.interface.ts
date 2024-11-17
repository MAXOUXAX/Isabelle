import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export interface IsabelleCommand {
  commandData: SlashCommandBuilder;

  executeCommand(interaction: CommandInteraction): void | Promise<void>;
}
