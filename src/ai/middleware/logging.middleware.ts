import { createLogger } from '@/utils/logger.js';
import { LanguageModelMiddleware } from 'ai';

const logger = createLogger('ai');

export const loggingMiddleware: LanguageModelMiddleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    logger.info({ params }, `Generating text with an AI model...`);

    const result = await doGenerate();

    logger.info({ result }, `Generated response:`);

    return result;
  },
};
