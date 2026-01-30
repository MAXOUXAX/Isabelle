import { Message } from 'discord.js';

export async function snakeCaseMessageListener(
  message: Message,
): Promise<void> {
  if (message.author.bot) return;

  // 5% chance
  if (Math.random() >= 0.05) {
    return;
  }

  const content = message.content;
  if (!content) return;

  const snakeCased = content.trim().toLowerCase().replace(/\s+/g, '_');

  // Only reply if the snake_case version is different and contains at least one underscore
  // (This avoids replying to single words or already snake_cased messages)
  if (snakeCased === content.toLowerCase() || !snakeCased.includes('_')) {
    return;
  }

  await message.reply(snakeCased);
}
