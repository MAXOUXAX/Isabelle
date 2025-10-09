import { IsabelleModule } from '@/modules/bot-module.js';
import { AnniversaireCommand } from './commands/anniversaire.command.js';
import { startBirthdayChecker } from './utils/birthday-checker.js';

export class BirthdaysModule extends IsabelleModule {
  readonly name = 'Anniversaires';

  init(): void {
    this.registerCommands([new AnniversaireCommand()]);

    // Start the daily birthday checker
    startBirthdayChecker();
  }
}
