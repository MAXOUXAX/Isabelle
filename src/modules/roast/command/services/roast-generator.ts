import { GEMINI_4_HYDROGEN } from '@/ai/models/gemini-models.wrapped.js';
import { createWebSearchTool } from '@/ai/tools/web-search.tool.js';
import { config } from '@/config.js';
import { ROAST_PROMPT } from '@/modules/roast/command/templates/roast-prompt.js';
import { createLogger } from '@/utils/logger.js';
import { extractModelVersion } from '@/utils/model-version.js';
import type { GoogleLanguageModelOptions } from '@ai-sdk/google';
import { generateText, isStepCount } from 'ai';
import type { Message } from 'discord.js';

const logger = createLogger('roast-generator');

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

// Up to three rounds of web search, then a final step that must write the roast.
const MAX_STEPS = 4;

const webSearch = createWebSearchTool(config.EXA_API_KEY);

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
    model: GEMINI_4_HYDROGEN,
    tools: webSearch ? { web_search: webSearch } : {},
    stopWhen: isStepCount(MAX_STEPS),
    prepareStep: ({ stepNumber }) =>
      stepNumber === MAX_STEPS - 1 ? { toolChoice: 'none' } : undefined,
    instructions: ROAST_PROMPT.trim(),
    prompt:
      `La liste des messages récents de l'utilisateur cible, ${displayName} :\n` +
      preparedMessages,
    // Kept for extractModelVersion: the AI SDK drops response bodies by default.
    include: { responseBody: true },
    providerOptions: {
      google: {
        // Enough reasoning to pick searches and sharpen punchlines, without the latency of 'high'.
        thinkingConfig: { thinkingLevel: 'medium' },
      } satisfies GoogleLanguageModelOptions,
    },
  });

  logger.debug(
    {
      usage: result.usage,
      textLength: result.text.length,
    },
    'Generated roast result',
  );

  const modelVersion = extractModelVersion(result.finalStep.response.body);

  return {
    text: result.text.trim(),
    modelVersion,
    totalTokens: result.usage.totalTokens ?? 0,
  };
}
