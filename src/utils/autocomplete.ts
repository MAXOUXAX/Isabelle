import type {
  ApplicationCommandOptionChoiceData,
  AutocompleteFocusedOption,
  AutocompleteInteraction,
} from 'discord.js';

export const MAX_AUTOCOMPLETE_CHOICES = 25;

export type AutocompleteChoice =
  | string
  | ApplicationCommandOptionChoiceData<string>;

export type AutocompleteOptionHandler = (context: {
  interaction: AutocompleteInteraction;
  focusedOption: AutocompleteFocusedOption;
  focusedValue: string;
  subcommand: string | null;
  subcommandGroup: string | null;
}) => AutocompleteChoice[] | Promise<AutocompleteChoice[]>;

export interface AutocompleteRegistry<Keys extends string> {
  keys: readonly Keys[];
  handle: (interaction: AutocompleteInteraction) => Promise<void>;
}

const normalizeChoice = (
  choice: AutocompleteChoice,
): ApplicationCommandOptionChoiceData<string> =>
  typeof choice === 'string' ? { name: choice, value: choice } : choice;

const matchesFocusedValue = (
  choice: AutocompleteChoice,
  focusedValue: string,
): boolean => {
  const label =
    typeof choice === 'string' ? choice : `${choice.name} ${choice.value}`;
  const lowerLabel = label.toLowerCase();
  const searchTerms = focusedValue
    .split(/\s+/)
    .filter((term) => term.length > 0);

  return searchTerms.every((term) => lowerLabel.includes(term));
};

export const limitAutocompleteChoices = (
  choices: AutocompleteChoice[],
  limit = MAX_AUTOCOMPLETE_CHOICES,
): ApplicationCommandOptionChoiceData<string>[] =>
  choices.slice(0, limit).map(normalizeChoice);

export const filterAutocompleteChoices = (
  choices: AutocompleteChoice[],
  focusedValue: string,
  limit = MAX_AUTOCOMPLETE_CHOICES,
): ApplicationCommandOptionChoiceData<string>[] => {
  const normalizedFocus = focusedValue.trim().toLowerCase();

  const filteredChoices =
    normalizedFocus.length === 0
      ? choices
      : choices.filter((choice) =>
          matchesFocusedValue(choice, normalizedFocus),
        );

  return limitAutocompleteChoices(filteredChoices, limit);
};

export const createAutocompleteRegistry = <const Keys extends string>(
  handlers: Record<Keys, AutocompleteOptionHandler>,
): AutocompleteRegistry<Keys> => {
  const keys = Object.keys(handlers) as Keys[];
  const handlerMap: Partial<Record<string, AutocompleteOptionHandler>> =
    handlers;

  const handle = async (interaction: AutocompleteInteraction) => {
    const focusedOption = interaction.options.getFocused(true);
    const handler = handlerMap[focusedOption.name];

    if (!handler) {
      await interaction.respond([]);
      return;
    }

    const focusedValue =
      typeof focusedOption.value === 'string'
        ? focusedOption.value
        : String(focusedOption.value);
    const subcommand = interaction.options.getSubcommand(false) ?? null;
    const subcommandGroup =
      interaction.options.getSubcommandGroup(false) ?? null;

    const choices = await handler({
      interaction,
      focusedOption,
      focusedValue,
      subcommand,
      subcommandGroup,
    });

    await interaction.respond(limitAutocompleteChoices(choices));
  };

  return {
    keys,
    handle,
  };
};
