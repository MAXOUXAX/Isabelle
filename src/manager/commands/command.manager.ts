import { config } from '@/config.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import { ApplicationCommandOptionType, REST, Routes } from 'discord.js';
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

  registerCommandsFromModule(module: IsabelleModule) {
    this.commands.set(module, module.commands);
    void this.events.emit('commandsRegistered', {
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
      const subcommandCount = this.countSubcommands(json.options);

      return total + (subcommandCount > 0 ? subcommandCount : 1);
    }, 0);
  }

  private countSubcommands(options: unknown): number {
    if (!Array.isArray(options)) {
      return 0;
    }

    let count = 0;

    for (const option of options) {
      if (!option || typeof option !== 'object') {
        continue;
      }

      const optionType = (option as { type?: number }).type;

      if (optionType === ApplicationCommandOptionType.Subcommand) {
        count += 1;
        continue;
      }

      if (optionType === ApplicationCommandOptionType.SubcommandGroup) {
        const nestedOptions = (option as { options?: unknown }).options;
        count += this.countSubcommands(nestedOptions);
      }
    }

    return count;
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
