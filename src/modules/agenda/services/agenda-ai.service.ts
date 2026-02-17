import {
  DEFAULT_AGENDA_EMOJI,
  agendaAssistant,
} from '@/modules/agenda/services/ai/agenda-assistant.js';
import { buildAiFooter } from '@/utils/ai-footer.js';
import { createLogger } from '@/utils/logger.js';

const logger = createLogger('agenda-ai');

const AI_DISCLAIMER =
  "Ce contenu a été amélioré par une intelligence artificielle et peut contenir des erreurs. Vérifie les informations importantes avant de t'y fier.";

export interface AiEnhancementOptions {
  enhanceText: boolean;
  enhanceEmoji: boolean;
}

interface AgendaAssistantResult {
  title: string;
  description: string;
  emoji: string;
  totalTokens: number;
  modelVersion?: string;
}

interface AiEnhancementResult {
  title: string;
  description: string;
  emoji: string;
  footer?: string;
}

function ensureTitleStartsWithEmoji(title: string, emoji: string): string {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return emoji;
  }

  if (normalizedTitle.startsWith(emoji)) {
    return normalizedTitle;
  }

  return `${emoji} ${normalizedTitle}`;
}

function isAgendaAssistantOutput(
  value: unknown,
): value is AgendaAssistantResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'title' in value &&
    typeof value.title === 'string' &&
    'description' in value &&
    typeof value.description === 'string' &&
    'emoji' in value &&
    typeof value.emoji === 'string' &&
    'totalTokens' in value &&
    typeof value.totalTokens === 'number' &&
    (!('modelVersion' in value) ||
      typeof (value as { modelVersion?: unknown }).modelVersion === 'string')
  );
}

async function tryEnhanceWithAi(
  title: string,
  description: string,
): Promise<AiEnhancementResult | null> {
  logger.debug({ title, description }, 'Enhancing event with AI');

  const result = await agendaAssistant.execute({ title, description });

  if (!isAgendaAssistantOutput(result)) {
    logger.warn('AI enhancement failed');
    return null;
  }

  logger.info({ title, description }, 'Event enhanced with AI');

  return {
    title: result.title,
    description: result.description,
    emoji: result.emoji,
    footer: buildAiFooter({
      disclaimer: AI_DISCLAIMER,
      totalTokens: result.totalTokens,
      modelVersion: result.modelVersion,
    }),
  };
}

export async function applyAiEnhancements({
  title,
  description,
  options = { enhanceText: true, enhanceEmoji: true },
  baseEmoji = DEFAULT_AGENDA_EMOJI,
}: {
  title: string;
  description: string;
  options?: AiEnhancementOptions;
  baseEmoji?: string;
}): Promise<AiEnhancementResult> {
  const shouldEnhance = options.enhanceText || options.enhanceEmoji;
  const aiResult = shouldEnhance
    ? await tryEnhanceWithAi(title, description)
    : null;

  const finalEmoji =
    options.enhanceEmoji && aiResult ? aiResult.emoji : baseEmoji;
  const titleWithoutEmoji =
    options.enhanceText && aiResult ? aiResult.title : title;

  return {
    title: ensureTitleStartsWithEmoji(titleWithoutEmoji, finalEmoji),
    description:
      options.enhanceText && aiResult ? aiResult.description : description,
    emoji: finalEmoji,
    footer: aiResult?.footer,
  };
}
