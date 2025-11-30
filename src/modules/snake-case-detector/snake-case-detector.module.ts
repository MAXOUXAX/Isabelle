import { client } from '@/index.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import { Events, Message } from 'discord.js';
import { SnakeCaseCommand } from './commands/snake-case.command.js';
import { snakeCaseMessageListener } from './events/snake-case.listener.js';

const logger = createLogger('snake-case-detector');

export class SnakeCaseDetectorModule extends IsabelleModule {
  readonly name = 'Snake Case Detector';

  init(): void {
    this.registerCommands([new SnakeCaseCommand()]);
    client.on(Events.MessageCreate, this.handleMessageCreate);
  }

  private handleMessageCreate = (message: Message): void => {
    snakeCaseMessageListener(message).catch((error: unknown) => {
      logger.error({ error }, 'Error processing snake_case message:');
    });
  };
}
