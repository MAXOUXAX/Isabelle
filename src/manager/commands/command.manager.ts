import { config } from '@/config.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import {
  REST,
  Routes,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

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

    return undefined;
  }

  async deployCommandsGlobally() {
    try {
      console.log('Started refreshing global application (/) commands.');

      const commands = Array.from(this.commands.values())
        .flat()
        .map((command) => command.commandData);

      await this.rest.put(
        Routes.applicationCommands(config.DISCORD_CLIENT_ID),
        {
          body: commands,
        },
      );

      console.log('Successfully reloaded global application (/) commands.');
    } catch (error) {
      console.error(error);
    }
  }

  async deployCommandsForGuild(
    guildId: string,
    commands: SlashCommandBuilder[],
  ) {
    try {
      console.log('Started refreshing application (/) commands.');

      await this.rest.put(
        Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guildId),
        {
          body: commands,
        },
      );

      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error(error);
    }
  }

  getIsabelleCommandsAsSlashBuilderArray(): (
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
  )[] {
    return Array.from(this.commands.values())
      .flat()
      .map((command) => command.commandData);
  }
}

export const commandManager = new CommandManager();
