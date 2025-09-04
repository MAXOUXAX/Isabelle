import { IsabelleModule } from '@/modules/bot-module.js';
import { Bonjour } from './commands/bonjour.js';
import { Ping } from './commands/ping.js';

export class CoreModule extends IsabelleModule {
  readonly name = 'core';

  init(): void {
    this.registerCommands([new Bonjour(), new Ping()]);
  }
}
