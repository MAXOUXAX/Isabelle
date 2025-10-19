import { client } from '@/index.js';
import { commandManager } from '@/manager/commands/command.manager.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import { debounce } from '@/utils/debounce.js';
import { environment } from '@/utils/environment.js';
import { ActivityType } from 'discord.js';
import { createRequire } from 'node:module';
import { Bonjour } from './commands/bonjour.js';
import { Ping } from './commands/ping.js';

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
    this.registerCommands([new Bonjour(), new Ping()]);
    this.setActivity();
  }

  private setActivity(): void {
    if (environment == 'development') {
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

    const commandCount = commandManager.getFlatCommandsArray().length;
    state += ` - ${String(commandCount)} commandes`;

    client.user?.setActivity({
      name: 'En production',
      type: ActivityType.Custom,
      state: state,
    });
  }
}
