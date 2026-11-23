import { loggingMiddleware } from '@/ai/middleware/logging.middleware.js';
import { google } from '@ai-sdk/google';
import { wrapLanguageModel } from 'ai';

export const GEMINI_4_HYDROGEN = wrapLanguageModel({
  model: google('gemini-4-hydrogen'),
  middleware: [loggingMiddleware],
});
