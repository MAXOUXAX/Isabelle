import {
  DiscordAPIError,
  MessageFlags,
  type RepliableInteraction,
} from 'discord.js';
import type { Logger } from 'pino';

export class AgendaUserError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = 'AgendaUserError';
  }
}

export type AgendaErrorResponseMode = 'auto' | 'edit' | 'followUp';

interface AgendaErrorHandlerOptions {
  interaction: RepliableInteraction;
  error: unknown;
  logger: Logger;
  fallbackMessage: string;
  responseMode?: AgendaErrorResponseMode;
}

async function replyWithError(
  interaction: RepliableInteraction,
  message: string,
  responseMode: AgendaErrorResponseMode,
): Promise<void> {
  try {
    if (responseMode === 'edit') {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message });
        return;
      }

      await interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (responseMode === 'followUp') {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: message,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.deferred) {
      await interaction.editReply({ content: message });
      return;
    }

    if (interaction.replied) {
      await interaction.followUp({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    if (!(error instanceof DiscordAPIError) || error.code !== 10008) {
      throw error;
    }
    // Ignore reply failures when the message was deleted or is unknown (10008).
  }
}

export async function handleAgendaError({
  interaction,
  error,
  logger,
  fallbackMessage,
  responseMode = 'auto',
}: AgendaErrorHandlerOptions): Promise<void> {
  if (error instanceof AgendaUserError) {
    await replyWithError(interaction, error.userMessage, responseMode);
    return;
  }

  logger.error({ error }, 'Unhandled agenda error');
  await replyWithError(interaction, fallbackMessage, responseMode);
}

export function withAgendaErrorHandling<T extends RepliableInteraction>(
  logger: Logger,
  handler: (interaction: T) => Promise<void>,
  fallbackMessage: string,
  responseMode: AgendaErrorResponseMode = 'auto',
): (interaction: T) => Promise<void> {
  return async (interaction: T) => {
    try {
      await handler(interaction);
    } catch (error) {
      await handleAgendaError({
        interaction,
        error,
        logger,
        fallbackMessage,
        responseMode,
      });
    }
  };
}
