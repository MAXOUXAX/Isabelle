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

interface GenerateRoastResult {
  text: string;
  modelVersion?: string;
  totalTokens: number;
}

export async function generateRoast({
  displayName,
  messages,
}: GenerateRoastOptions): Promise<GenerateRoastResult> {
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const preparedMessages = messages
    .map((message) => {
      const formattedDate = dateFormatter.format(message.createdAt);
      const channelName =
        ('name' in message.channel ? message.channel.name : 'DM') ?? 'Inconnu';
      const { content } = message;

      return `- ${formattedDate} - #${channelName} - ${content}`;
    })
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

  const modelVersion =
    result.response.body &&
    typeof result.response.body === 'object' &&
    'modelVersion' in result.response.body &&
    typeof result.response.body.modelVersion === 'string'
      ? result.response.body.modelVersion
      : undefined;

  return {
    text: result.text.trim(),
    modelVersion,
    totalTokens: result.usage.totalTokens ?? 0,
  };
}
