import { GEMINI_2_5_FLASH } from '@/ai/models/gemini-models.wrapped.js';
import { ROAST_PROMPT } from '@/modules/roast/command/templates/roast-prompt.js';
import { createLogger } from '@/utils/logger.js';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { Message } from 'discord.js';

const logger = createLogger('roast-generator');

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

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
  const preparedMessages = messages
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((message) => {
      const formattedDate = dateFormatter.format(message.createdAt);
      const channelName =
        ('name' in message.channel ? message.channel.name : 'DM') ?? 'Inconnu';
      const { content } = message;

      return `- ${formattedDate} - #${channelName} - ${content}`;
    })
    .join('\n');

  const result = await generateText({
    model: GEMINI_2_5_FLASH,
    tools: {
      google_search: google.tools.googleSearch({}),
    },
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
