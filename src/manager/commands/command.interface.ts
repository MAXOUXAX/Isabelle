import {
  CommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

export interface IsabelleCommand {
  commandData: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;

  executeCommand(interaction: CommandInteraction): void | Promise<void>;
}
