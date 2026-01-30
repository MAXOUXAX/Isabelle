import { client } from '@/index.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import { Events, Message } from 'discord.js';
import { snakeCaseMessageListener } from './events/snake-case.listener.js';

const logger = createLogger('snake-case');

export class SnakeCaseModule extends IsabelleModule {
  readonly name = 'Snake Case';

  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Jules',
        githubUsername: 'google-labs-jules',
      },
      {
        displayName: 'Maxence',
        githubUsername: 'MAXOUXAX',
      },
    ];
  }

  init(): void {
    client.on(Events.MessageCreate, this.handleMessageCreate);
  }

  private handleMessageCreate = (message: Message): void => {
    snakeCaseMessageListener(message).catch((error: unknown) => {
      logger.error({ error }, 'Error processing message:');
    });
  };
}
