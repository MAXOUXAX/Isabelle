import { IsabelleModule } from '@/modules/bot-module.js';
import {
  TodaysLessonCommand,
} from '@/modules/schedule/commands/schedule.command.js';

export class Schedule extends IsabelleModule {
  readonly name = 'Schedule';

  init(): void {
    this.registerCommands([
      new TodaysLessonCommand(),
    ]);
  }
}
