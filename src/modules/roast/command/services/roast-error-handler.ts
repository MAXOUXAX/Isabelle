import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';

const logger = createLogger('roast-error-handler');

interface HandleRoastErrorOptions {
  interaction: ChatInputCommandInteraction;
  fallbackContent: string;
  hasDeferred: boolean;
}

export async function handleRoastError({
  interaction,
  fallbackContent,
  hasDeferred,
}: HandleRoastErrorOptions): Promise<void> {
  try {
    if (interaction.deferred || interaction.replied || hasDeferred) {
      await interaction.editReply(fallbackContent);
      return;
    }

    await interaction.reply({
      content: fallbackContent,
      flags: MessageFlags.Ephemeral,
    });
  } catch (replyError) {
    logger.warn({ replyError }, 'Failed to send fallback roast response');
  }
}
