import { IsabelleModule } from '@/modules/bot-module.js';
import { StartSutomCommand } from '@/modules/sutom/commands/startSutom.command.js';
import { SutomCommand } from '@/modules/sutom/commands/sutom.command.js';

export class SutomModule extends IsabelleModule {
  readonly name = 'Sutom';

  init(): void {
    this.registerCommands([new SutomCommand(), new StartSutomCommand()]);
  }
}
