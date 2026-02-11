import { BirthdayCommand } from '@/modules/birthday/commands/birthday.command.js';
import { startBirthdayScheduler } from '@/modules/birthday/services/birthday.scheduler.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';

export class BirthdayModule extends IsabelleModule {
  readonly name = 'Birthday';
  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Jules',
        githubUsername: 'Jules',
      },
    ];
  }

  init(): void {
    this.registerCommands([new BirthdayCommand()]);
    startBirthdayScheduler();
  }
}
