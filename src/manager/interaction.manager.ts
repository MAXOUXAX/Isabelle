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
    if (!(interaction.isMessageComponent() || interaction.isModalSubmit())) {
      logger.debug(
        `Ignoring unsupported interaction type: ${interaction.type.toString()}`,
      );
      return;
    }

    const customId = interaction.customId;
    let handler = this.handlers.get(customId);

    if (!handler) {
      // Try prefix matching for handlers that use prefixes (e.g., "consent" matches "consent-generative-ai-decline")
      logger.debug(
        `No exact match found, attempting prefix matching for customId: "${customId}"`,
      );

      for (const [handlerCustomId, handlerInstance] of this.handlers) {
        if (customId.startsWith(handlerCustomId + ':')) {
          logger.debug(
            {
              matchedPrefix: handlerCustomId,
              fullCustomId: customId,
            },
            `Found prefix match: handler "${handlerCustomId}" matches "${customId}"`,
          );
          handler = handlerInstance;
          break;
        }
      }
    }

    if (handler) {
      logger.debug(
        {
          customId,
          userId: interaction.user.id,
          guildId: interaction.guildId,
        },
        `Handling interaction: ${customId} from user ${interaction.user.id}`,
      );
      await handler.handle(interaction);
    } else {
      logger.warn(
        {
          customId,
          userId: interaction.user.id,
          guildId: interaction.guildId,
          registeredHandlers: Array.from(this.handlers.keys()),
        },
        `No handler registered for interaction customId: "${customId}"`,
      );
    }
  }
}

export const interactionManager = new InteractionManager();
