import { config } from '@/config.js';
import {
  IsabelleCommand,
  isAutocompleteCommand,
} from '@/manager/commands/command.interface.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import { countSubcommands } from '@/utils/commands.js';
import { createLogger } from '@/utils/logger.js';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { ApplicationCommandOptionType, REST, Routes } from 'discord.js';
import Emittery from 'emittery';

const logger = createLogger('commands');

interface CommandManagerEvents {
  commandsRegistered: {
    module: IsabelleModule;
    commands: IsabelleCommand[];
  };
}

const collectAutocompleteOptions = (
  options: RESTPostAPIChatInputApplicationCommandsJSONBody['options'],
  names: string[],
): void => {
  if (!options) return;

  for (const option of options) {
    if (
      option.type === ApplicationCommandOptionType.Subcommand ||
      option.type === ApplicationCommandOptionType.SubcommandGroup
    ) {
      if ('options' in option) {
        collectAutocompleteOptions(
          option.options as RESTPostAPIChatInputApplicationCommandsJSONBody['options'],
          names,
        );
      }
      continue;
    }

    if ('autocomplete' in option && option.autocomplete) {
      names.push(option.name);
    }
  }
};

const getAutocompleteOptionNames = (
  commandData: RESTPostAPIChatInputApplicationCommandsJSONBody,
): string[] => {
  const names: string[] = [];
  collectAutocompleteOptions(commandData.options, names);
  return names;
};

export class CommandManager {
  private commands = new Map<IsabelleModule, IsabelleCommand[]>();
  private rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
  private events = new Emittery<CommandManagerEvents>();

  /**
   * Registers commands from a module and emits the 'commandsRegistered' event.
   *
   * This method is async to support event emission. The 'commandsRegistered'
   * event may have async listeners, so we await Emittery.emit to ensure all
   * listeners complete before proceeding.
   */
  async registerCommandsFromModule(module: IsabelleModule) {
    for (const command of module.commands) {
      const commandJson =
        command.commandData.toJSON() as unknown as RESTPostAPIChatInputApplicationCommandsJSONBody;
      const autocompleteOptions = getAutocompleteOptionNames(commandJson);

      if (autocompleteOptions.length > 0 && !isAutocompleteCommand(command)) {
        throw new Error(
          `La commande "${command.commandData.name}" définit l'autocomplétion pour ${autocompleteOptions.join(', ')} mais ne fournit pas de gestionnaire d'autocomplétion.`,
        );
      }

      if (autocompleteOptions.length > 0 && isAutocompleteCommand(command)) {
        const declaredOptions = command.autocompleteOptions;
        const missingOptions = autocompleteOptions.filter(
          (option) => !declaredOptions.includes(option),
        );
        const extraOptions = declaredOptions.filter(
          (option) => !autocompleteOptions.includes(option),
        );

        if (missingOptions.length > 0 || extraOptions.length > 0) {
          throw new Error(
            `La commande "${command.commandData.name}" a une configuration d'autocomplétion invalide. Manquants: ${missingOptions.join(', ') || 'aucun'}. En trop: ${extraOptions.join(', ') || 'aucun'}.`,
          );
        }
      }
    }

    this.commands.set(module, module.commands);
    await this.events.emit('commandsRegistered', {
      module,
      commands: module.commands,
    });
  }

  onCommandsRegistered(
    listener: (
      payload: CommandManagerEvents['commandsRegistered'],
    ) => void | Promise<void>,
  ) {
    return this.events.on('commandsRegistered', listener);
  }

  findByName(name: string): IsabelleCommand | undefined {
    for (const commands of this.commands.values()) {
      const command = commands.find(
        (command) => command.commandData.name === name,
      );
      if (command) {
        return command;
      }
    }
  }

  getFlatCommandsArray() {
    return Array.from(this.commands.values())
      .flat()
      .map((command) => command.commandData);
  }

  getCommandCountIncludingSubcommands(): number {
    return this.getFlatCommandsArray().reduce((total, command) => {
      const json = command.toJSON();
      const subcommandCount = countSubcommands(json.options);

      return total + (subcommandCount > 0 ? subcommandCount : 1);
    }, 0);
  }

  async deployCommandsGlobally() {
    try {
      logger.info(
        'Registering global application commands (/) via REST API...',
      );

      const commands = this.getFlatCommandsArray();

      await this.rest.put(
        Routes.applicationCommands(config.DISCORD_CLIENT_ID),
        {
          body: commands,
        },
      );

      logger.info(
        'Successfully registered global application commands (/) via REST API.',
      );
    } catch (error) {
      logger.error({ error }, 'Failed to register global commands:');
    }
  }

  async deployCommandsForGuild(guildId: string) {
    try {
      logger.info(
        `Started registering application commands (/) for guild ${guildId}.`,
      );

      const commands = this.getFlatCommandsArray();

      await this.rest.put(
        Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guildId),
        {
          body: commands,
        },
      );

      logger.info(
        'Successfully registered application commands (/) for guild via REST API.',
      );
    } catch (error) {
      logger.error({ error }, 'Failed to register guild commands!');
    }
  }
}

export const commandManager = new CommandManager();
