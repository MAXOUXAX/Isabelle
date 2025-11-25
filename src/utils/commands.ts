import {
  ApplicationCommandOptionType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

type CommandOptions =
  RESTPostAPIChatInputApplicationCommandsJSONBody['options'];

/**
 * Counts the number of subcommands in a command's options array.
 * Recursively counts subcommands within subcommand groups.
 *
 * @param options - The command options to count subcommands from
 * @returns The total number of subcommands found
 */
export function countSubcommands(options: CommandOptions): number {
  if (!options) return 0;

  let count = 0;
  for (const option of options) {
    if (option.type === ApplicationCommandOptionType.Subcommand) {
      count++;
    } else if (
      option.type === ApplicationCommandOptionType.SubcommandGroup &&
      'options' in option
    ) {
      count += countSubcommands(option.options as CommandOptions);
    }
  }
  return count;
}
