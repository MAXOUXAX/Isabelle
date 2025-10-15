import { createLogger } from '@/utils/logger.js';
import { LanguageModelMiddleware } from 'ai';

const logger = createLogger('ai');

const MAX_CONTENT_LOG_LENGTH = 200;

export const loggingMiddleware: LanguageModelMiddleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const usefulParams = {
      providerOptions: params.providerOptions,
      prompt: params.prompt.map((p) => {
        const contentStr = JSON.stringify(p.content);
        return {
          role: p.role,
          content:
            contentStr.length > MAX_CONTENT_LOG_LENGTH
              ? contentStr.slice(0, MAX_CONTENT_LOG_LENGTH) + '...'
              : contentStr,
        };
      }),
    };
    logger.info({ usefulParams }, `Generating text with an AI model...`);

    const result = await doGenerate();

    const firstContent = result.content.at(0);
    const contentText =
      firstContent &&
      'text' in firstContent &&
      typeof firstContent.text === 'string'
        ? firstContent.text.slice(0, MAX_CONTENT_LOG_LENGTH) + '...'
        : undefined;

    const usefulResults = {
      content: {
        type: firstContent?.type,
        text: contentText,
      },
      usage: result.usage,
      warnings: result.warnings,
      providerMetadata: result.providerMetadata,
      body: {
        modelVersion:
          result.response?.body &&
          typeof result.response.body === 'object' &&
          'modelVersion' in result.response.body
            ? result.response.body.modelVersion
            : undefined,
      },
    };

    logger.info({ usefulResults }, `Generated response:`);

    return result;
  },
};
