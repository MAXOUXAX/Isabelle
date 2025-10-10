import { IsabelleModule } from '@/modules/bot-module.js';
import { TrashTalkCommand } from '@/modules/trashtalk/command/trashtalk.command.js';

export class Trashtalk extends IsabelleModule {
  readonly name = 'Trashtalk';

  init(): void {
    this.registerCommands([new TrashTalkCommand()]);
  }
}
