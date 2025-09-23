import { Interaction } from 'discord.js';
import { createLogger } from '@/utils/logger.js';
import { InteractionHandler } from '../modules/bot-module.js';

const logger = createLogger('interactions');

export class InteractionManager {
  private handlers = new Map<string, InteractionHandler>();

  registerInteractionHandlers(handlers: InteractionHandler[]) {
    handlers.forEach((handler) => {
      this.handlers.set(handler.customId, handler);
    });
  }

  async handleInteraction(interaction: Interaction) {
    if (!interaction.isMessageComponent()) {
      logger.debug('Interaction is not a message component');
      return;
    }

    const handler = this.handlers.get(interaction.customId);
    if (handler) {
      await handler.handle(interaction);
    } else {
      logger.warn(
        `No handler found for interaction with customId ${interaction.customId}`,
      );
    }
  }
}

export const interactionManager = new InteractionManager();
