import type { AutocompleteOptionHandler } from '@/utils/autocomplete.js';
import { createAutocompleteRegistry } from '@/utils/autocomplete.js';
import {
  AutocompleteInteraction,
  CommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export interface IsabelleCommand {
  commandData:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder;

  executeCommand(interaction: CommandInteraction): void | Promise<void>;
}

interface IsabelleAutocompleteCommand extends IsabelleCommand {
  autocomplete(interaction: AutocompleteInteraction): void | Promise<void>;
  autocompleteOptions: readonly string[];
}

export const isAutocompleteCommand = (
  command: IsabelleCommand,
): command is IsabelleAutocompleteCommand =>
  typeof (command as IsabelleAutocompleteCommand).autocomplete === 'function' &&
  Array.isArray((command as IsabelleAutocompleteCommand).autocompleteOptions);

export abstract class IsabelleAutocompleteCommandBase implements IsabelleAutocompleteCommand {
  abstract commandData:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder;

  abstract executeCommand(
    interaction: CommandInteraction,
  ): void | Promise<void>;

  protected abstract getAutocompleteHandlers(): Record<
    string,
    AutocompleteOptionHandler
  >;

  private autocompleteRegistry:
    | ReturnType<typeof createAutocompleteRegistry>
    | undefined;

  get autocompleteOptions(): readonly string[] {
    return this.getAutocompleteRegistry().keys;
  }

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    await this.getAutocompleteRegistry().handle(interaction);
  }

  private getAutocompleteRegistry() {
    this.autocompleteRegistry ??= createAutocompleteRegistry(
      this.getAutocompleteHandlers(),
    );

    return this.autocompleteRegistry;
  }
}
