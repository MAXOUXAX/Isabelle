import { client } from '@/index.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import { Events } from 'discord.js';
import { HotPotatoCommand } from './commands/hot-potato.command.js';
import { hotPotatoRoleListener } from './events/hot-potato-role.listener.js';

export class HotPotato extends IsabelleModule {
  readonly name = 'HotPotato';

  init(): void {
    this.registerHotPotatoEvent();
    this.registerCommands([new HotPotatoCommand()]);
  }

  registerHotPotatoEvent() {
    client.on(Events.GuildAuditLogEntryCreate, (...args) => {
      void hotPotatoRoleListener(...args);
    });
  }
}
