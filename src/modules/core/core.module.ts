import { client } from '@/index.js';
import { commandManager } from '@/manager/commands/command.manager.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import { debounce } from '@/utils/debounce.js';
import { environment } from '@/utils/environment.js';
import { ActivityType, ApplicationCommandOptionType } from 'discord.js';
import { createRequire } from 'node:module';
import { Bonjour } from './commands/bonjour.js';

const require = createRequire(import.meta.url);
const { version } = require('../../../package.json') as { version: string };

export class CoreModule extends IsabelleModule {
  readonly name = 'core';
  private readonly activityDebounceMs = 5000;
  private readonly scheduleActivityUpdate = debounce(
    this.setActivity.bind(this),
    this.activityDebounceMs,
  );

  init(): void {
    commandManager.onCommandsRegistered(this.scheduleActivityUpdate);
    this.registerCommands([new Bonjour()]);
    this.setActivity();
  }

  private setActivity(): void {
    if (environment === 'development') {
      client.user?.setActivity({
        name: 'En développement',
        type: ActivityType.Custom,
        state: 'Se développe elle même',
      });
      return;
    }

    // Production status

    let state = `v${version}`;
    if (client.guilds.cache.size > 1) {
      const totalUsers = client.guilds.cache.reduce(
        (acc, guild) => acc + guild.memberCount,
        0,
      );
      state += ` - ${String(client.guilds.cache.size)} serveurs - ${String(totalUsers)} utilisateurs`;
    }

    const commandCount = this.getCommandCount();
    state += ` - ${String(commandCount)} commandes`;

    client.user?.setActivity({
      name: 'En production',
      type: ActivityType.Custom,
      state: state,
    });
  }

  private getCommandCount(): number {
    return commandManager.getFlatCommandsArray().reduce((total, command) => {
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
}
