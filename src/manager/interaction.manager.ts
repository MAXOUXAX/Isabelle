import { Interaction } from 'discord.js';
import { InteractionHandler } from '../modules/bot-module.js';

export class InteractionManager {
  private handlers = new Map<string, InteractionHandler>();

  registerInteractionHandlers(handlers: InteractionHandler[]) {
    handlers.forEach((handler) => {
      this.handlers.set(handler.customId, handler);
    });
  }

  async handleInteraction(interaction: Interaction) {
    if (!interaction.isMessageComponent()) {
      console.log('Interaction is not a message component');
      return;
    }

    const handler = this.handlers.get(interaction.customId);
    if (handler) {
      await handler.handle(interaction);
    } else {
      console.warn(
        `No handler found for interaction with customId ${interaction.customId}`,
      );
    }
  }
}

export const interactionManager = new InteractionManager();
