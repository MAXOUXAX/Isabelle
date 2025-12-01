import { client } from '@/index.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import { SutomCommand } from '@/modules/sutom/commands/sutom.command.js';
import { sutomMessageListener } from '@/modules/sutom/events/sutom-message.listener.js';
import { createLogger } from '@/utils/logger.js';
import { Events, Message } from 'discord.js';

const logger = createLogger('sutom-module');

export class SutomModule extends IsabelleModule {
  readonly name = 'Sutom';

  init(): void {
    this.registerCommands([new SutomCommand()]);
    client.on(Events.MessageCreate, this.handleMessageCreate);
  }

  private handleMessageCreate = (message: Message): void => {
    sutomMessageListener(message).catch((error: unknown) => {
      logger.error({ error }, 'Error processing SUTOM message:');
    });
  };
}
