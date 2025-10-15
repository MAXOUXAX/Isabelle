import { IsabelleModule } from '@/modules/bot-module.js';
import { RoastCommand } from '@/modules/roast/command/roast.command.js';

export class RoastModule extends IsabelleModule {
  readonly name = 'Roast';

  init(): void {
    this.registerCommands([new RoastCommand()]);
  }
}
