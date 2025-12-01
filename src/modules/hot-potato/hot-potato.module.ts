import { client } from '@/index.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { voidAndTrackError } from '@/utils/promises.js';
import { Events } from 'discord.js';
import { HotPotatoCommand } from './commands/hot-potato.command.js';
import { hotPotatoRoleListener } from './events/hot-potato-role.listener.js';

export class HotPotato extends IsabelleModule {
  readonly name = 'HotPotato';
  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Maxence',
        githubUsername: 'MAXOUXAX',
      },
    ];
  }

  init(): void {
    this.registerHotPotatoEvent();
    this.registerCommands([new HotPotatoCommand()]);
  }

  registerHotPotatoEvent() {
    client.on(Events.GuildAuditLogEntryCreate, (...args) => {
      voidAndTrackError(hotPotatoRoleListener(...args));
    });
  }
}
