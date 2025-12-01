import { client } from '@/index.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import { Events, Message } from 'discord.js';
import { automaticResponseMessageListener } from './events/automatic-responses.listener.js';

const logger = createLogger('auto-responses');

export class AutomaticResponsesModule extends IsabelleModule {
  readonly name = 'Réponses automatiques';
  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Tanguy',
        githubUsername: 'TanguyFox',
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
    automaticResponseMessageListener(message).catch((error: unknown) => {
      logger.error({ error }, 'Error processing message:');
    });
  };
}
