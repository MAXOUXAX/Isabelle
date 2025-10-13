import { loggingMiddleware } from '@/ai/middleware/logging.middleware.js';
import { google } from '@ai-sdk/google';
import { wrapLanguageModel } from 'ai';

export const GEMINI_FLASH_LATEST = wrapLanguageModel({
  model: google('gemini-flash-latest'),
  middleware: [loggingMiddleware],
});
