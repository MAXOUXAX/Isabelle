import { config } from '@/config.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import { countSubcommands } from '@/utils/commands.js';
import { createLogger } from '@/utils/logger.js';
import { REST, Routes } from 'discord.js';
import Emittery from 'emittery';

const logger = createLogger('commands');

interface CommandManagerEvents {
  commandsRegistered: {
    module: IsabelleModule;
    commands: IsabelleCommand[];
  };
}

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
