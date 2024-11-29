import {
  CommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export interface IsabelleCommand {
  commandData: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;

  executeCommand(interaction: CommandInteraction): void | Promise<void>;
}
