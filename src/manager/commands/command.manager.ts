import { config } from '@/config.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import { logger } from '@/utils/logger.js';
import { REST, Routes } from 'discord.js';

export class CommandManager {
  private commands = new Map<IsabelleModule, IsabelleCommand[]>();
  private rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

  registerCommandsFromModule(module: IsabelleModule) {
    this.commands.set(module, module.commands);
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
      logger.error('Failed to register global commands:', error);
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
      logger.error('Failed to register guild commands:', error);
    }
  }
}

export const commandManager = new CommandManager();
