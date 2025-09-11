import { IsabelleModule } from '@/modules/bot-module.js';
import { RussianRouletteCommand } from './commands/russian-roulette.command.js';

export class RussianRoulette extends IsabelleModule {
  readonly name = 'RussianRoulette';

  init(): void {
    this.registerCommands([new RussianRouletteCommand()]);
  }
}
