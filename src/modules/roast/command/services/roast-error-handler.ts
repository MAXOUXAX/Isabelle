import { environment } from '@/utils/environment.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';

const logger = createLogger('roast-error-handler');

interface HandleRoastErrorOptions {
  interaction: ChatInputCommandInteraction;
  fallbackContent: string;
  hasDeferred: boolean;
  error?: unknown;
}

function extractErrorDetails(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  // Check for API error in the error object structure
  // Error structure: error.cause?.data?.error or error.data?.error
  let apiError: { code?: number; message?: string; status?: string } | null =
    null;

  if ('cause' in error && error.cause && typeof error.cause === 'object') {
    if ('data' in error.cause && error.cause.data) {
      const data = error.cause.data as Record<string, unknown>;
      if ('error' in data && data.error && typeof data.error === 'object') {
        apiError = data.error as {
          code?: number;
          message?: string;
          status?: string;
        };
      }
    }
  }

  if (
    !apiError &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object'
  ) {
    const data = error.data as Record<string, unknown>;
    if ('error' in data && data.error && typeof data.error === 'object') {
      apiError = data.error as {
        code?: number;
        message?: string;
        status?: string;
      };
    }
  }

  if (apiError?.message) {
    const parts: string[] = [];
    if (apiError.code) parts.push(`Code ${apiError.code.toString()}`);
    if (apiError.status) parts.push(apiError.status);
    if (apiError.message) parts.push(apiError.message);
    return parts.join(' - ');
  }

  // Check for standard error message
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return null;
}

export async function handleRoastError({
  interaction,
  fallbackContent,
  hasDeferred,
  error,
}: HandleRoastErrorOptions): Promise<void> {
  try {
    let contentToSend = fallbackContent;

    // In development or if we can extract useful error info, append debug details
    const errorDetails = error ? extractErrorDetails(error) : null;
    if (errorDetails) {
      if (environment === 'production') {
        if (errorDetails.includes('overloaded')) {
          contentToSend =
            "Le modèle d'IA est actuellement surchargé. Réessaie dans quelques instants !";
        } else if (errorDetails.includes('quota')) {
          contentToSend = "Quota d'utilisation dépassé. Réessaie plus tard !";
        } else if (errorDetails.includes('UNAVAILABLE')) {
          contentToSend =
            "Le service d'IA est temporairement indisponible. Réessaie dans quelques instants !";
        }
      } else {
        contentToSend += `\n\n-# Debug: ${errorDetails}`;
      }
    }

    if (interaction.deferred || interaction.replied || hasDeferred) {
      await interaction.editReply(contentToSend);
      return;
    }

    await interaction.reply({
      content: contentToSend,
      flags: MessageFlags.Ephemeral,
    });
  } catch (replyError) {
    logger.warn({ replyError }, 'Failed to send fallback roast response');
  }
}
