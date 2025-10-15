import { loggingMiddleware } from '@/ai/middleware/logging.middleware.js';
import { google } from '@ai-sdk/google';
import { wrapLanguageModel } from 'ai';

export const GEMINI_2_5_PRO = wrapLanguageModel({
  model: google('gemini-2.5-pro'),
  middleware: [loggingMiddleware],
});

export const GEMINI_2_5_FLASH = wrapLanguageModel({
  model: google('gemini-2.5-flash'),
  middleware: [loggingMiddleware],
});
