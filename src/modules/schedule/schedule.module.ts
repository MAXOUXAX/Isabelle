import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { ScheduleCommand } from '@/modules/schedule/commands/schedule.command.js';

export class Schedule extends IsabelleModule {
  readonly name = 'Schedule';
  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Tanguy',
        githubUsername: 'TanguyFox',
      },
    ];
  }

  init(): void {
    this.registerCommands([new ScheduleCommand()]);
  }
}
