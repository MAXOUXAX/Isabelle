import { splitMessageIntoChunks } from '@/utils/message-splitter.js';
import type { ChatInputCommandInteraction } from 'discord.js';

/**
 * Safely sends a message through a Discord interaction, splitting it into chunks if necessary.
 *
 * This function handles long messages by splitting them into multiple chunks and sending them
 * sequentially. The first chunk is sent as an edit to the original reply, while subsequent
 * chunks are sent as follow-up messages.
 *
 * @param interaction - The Discord chat input command interaction to respond to
 * @param message - The message content to send, which may be split into multiple chunks
 * @returns A promise that resolves when all message chunks have been sent
 *
 * @example
 * ```typescript
 * await safelySendMessage(interaction, "This is a very long message that might need to be split...");
 * ```
 */
export async function safelySendMessage(
  interaction: ChatInputCommandInteraction,
  message: string,
): Promise<void> {
  const chunks = splitMessageIntoChunks(message);

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];

    if (index === 0) {
      await interaction.editReply({ content: chunk });
      continue;
    }

    await interaction.followUp({ content: chunk });
  }
}
