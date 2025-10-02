import { createLogger } from '@/utils/logger.js';
import { Interaction } from 'discord.js';
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
      logger.debug(
        `Ignoring non-message component interaction (type: ${interaction.type.toString()})`,
      );
      return;
    }

    const handler = this.handlers.get(interaction.customId);
    if (handler) {
      logger.debug(
        `Handling interaction: ${interaction.customId} from user ${interaction.user.id}`,
      );
      await handler.handle(interaction);
    } else {
      logger.warn(
        { userId: interaction.user.id, guildId: interaction.guildId },
        `No handler registered for interaction customId: "${interaction.customId}"`,
      );
    }
  }
}

export const interactionManager = new InteractionManager();
