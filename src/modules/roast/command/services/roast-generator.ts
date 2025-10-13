import { GEMINI_FLASH_LATEST } from '@/ai/models/gemini-flash-latest.wrapped.js';
import { ROAST_PROMPT } from '@/modules/roast/command/templates/roast-prompt.js';
import { createLogger } from '@/utils/logger.js';
import { generateText } from 'ai';
import type { Message } from 'discord.js';

const logger = createLogger('roast-generator');

interface GenerateRoastOptions {
  displayName: string;
  messages: Message[];
}

export async function generateRoast({
  displayName,
  messages,
}: GenerateRoastOptions): Promise<string> {
  const preparedMessages = messages
    .map((message) => `- ${message.content}`)
    .join('\n');

  const result = await generateText({
    model: GEMINI_FLASH_LATEST,
    messages: [
      {
        role: 'system',
        content: ROAST_PROMPT.trim(),
      },
      {
        role: 'user',
        content:
          `La liste des messages récents de l'utilisateur cible, ${displayName} :\n` +
          preparedMessages,
      },
    ],
    providerOptions: {
      google: {
        thinkingBudget: 8192,
      },
    },
  });

  logger.debug(
    {
      usage: result.usage,
      textLength: result.text.length,
    },
    'Generated roast result',
  );

  return result.text.trim();
}
