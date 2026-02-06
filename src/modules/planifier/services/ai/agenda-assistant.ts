import { GEMINI_2_5_FLASH } from '@/ai/models/gemini-models.wrapped.js';
import { createLogger } from '@/utils/logger.js';
import { extractModelVersion } from '@/utils/model-version.js';
import { generateText } from 'ai';
import { AGENDA_ASSISTANT_PROMPT } from '../prompts/agenda-assistant.prompt.js';
import type { AiAssistant } from './ai-assistant.interface.js';

const logger = createLogger('agenda-assistant');

export const DEFAULT_AGENDA_EMOJI = '📅';
const THINKING_BUDGET_TOKENS = 256;

export interface AgendaAssistantInput {
  title: string;
  description: string;
}

export interface AgendaAssistantOutput {
  title: string;
  description: string;
  emoji: string;
  modelVersion?: string;
  totalTokens: number;
}

class AgendaAssistant implements AiAssistant<
  AgendaAssistantInput,
  AgendaAssistantOutput
> {
  async execute(
    input: AgendaAssistantInput,
  ): Promise<AgendaAssistantOutput | null> {
    try {
      const result = await generateText({
        model: GEMINI_2_5_FLASH,
        messages: [
          { role: 'system', content: AGENDA_ASSISTANT_PROMPT },
          {
            role: 'user',
            content: `Titre: ${input.title}\n\nDescription: ${input.description}`,
          },
        ],
        temperature: 0.1,
        providerOptions: {
          google: {
            thinkingBudget: THINKING_BUDGET_TOKENS,
          },
        },
      });

      let text = result.text.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(text) as unknown;

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'title' in parsed &&
        'description' in parsed &&
        'emoji' in parsed &&
        typeof parsed.title === 'string' &&
        typeof parsed.description === 'string' &&
        typeof parsed.emoji === 'string' &&
        parsed.emoji.length > 0
      ) {
        const modelVersion = extractModelVersion(result.response.body);

        logger.debug({ original: input, enhanced: parsed }, 'Enhanced event');
        return {
          title: parsed.title,
          description: parsed.description,
          emoji: parsed.emoji,
          modelVersion,
          totalTokens: result.usage.totalTokens ?? 0,
        };
      }

      logger.warn({ result: result.text }, 'AI returned unexpected format');
      return null;
    } catch (error) {
      logger.error({ error, input }, 'Failed to enhance agenda event');
      return null;
    }
  }
}

export const agendaAssistant = new AgendaAssistant();
