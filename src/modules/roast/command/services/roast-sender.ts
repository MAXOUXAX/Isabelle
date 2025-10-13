import { splitMessageIntoChunks } from '@/utils/discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';

export async function sendRoast(
  interaction: ChatInputCommandInteraction,
  roast: string,
): Promise<void> {
  const chunks = splitMessageIntoChunks(roast);

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];

    if (index === 0) {
      await interaction.editReply({ content: chunk });
      continue;
    }

    await interaction.followUp({ content: chunk });
  }
}
