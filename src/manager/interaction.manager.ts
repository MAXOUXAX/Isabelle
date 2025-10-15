import { createLogger } from '@/utils/logger.js';
import { Interaction } from 'discord.js';
import { InteractionHandler } from '../modules/bot-module.js';

const logger = createLogger('interactions');

export class InteractionManager {
  private handlers = new Map<string, InteractionHandler>();

  registerInteractionHandlers(handlersToRegister: InteractionHandler[]) {
    handlersToRegister.forEach((handler) => {
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

    let handler = this.handlers.get(interaction.customId);

    if (!handler) {
      // Try prefix matching for handlers that use prefixes (e.g., "consent" matches "consent-generative-ai-decline")
      logger.debug(
        `No exact match found, attempting prefix matching for customId: "${interaction.customId}"`,
      );

      for (const [handlerCustomId, handlerInstance] of this.handlers) {
        if (interaction.customId.startsWith(handlerCustomId + ':')) {
          logger.debug(
            {
              matchedPrefix: handlerCustomId,
              fullCustomId: interaction.customId,
            },
            `Found prefix match: handler "${handlerCustomId}" matches "${interaction.customId}"`,
          );
          handler = handlerInstance;
          break;
        }
      }
    }

    if (handler) {
      logger.debug(
        {
          customId: interaction.customId,
          userId: interaction.user.id,
          guildId: interaction.guildId,
        },
        `Handling interaction: ${interaction.customId} from user ${interaction.user.id}`,
      );
      await handler.handle(interaction);
    } else {
      logger.warn(
        {
          customId: interaction.customId,
          userId: interaction.user.id,
          guildId: interaction.guildId,
          registeredHandlers: Array.from(this.handlers.keys()),
        },
        `No handler registered for interaction customId: "${interaction.customId}"`,
      );
    }
  }
}

export const interactionManager = new InteractionManager();
