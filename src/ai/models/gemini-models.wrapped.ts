import { loggingMiddleware } from '@/ai/middleware/logging.middleware.js';
import { google } from '@ai-sdk/google';
import { wrapLanguageModel } from 'ai';

export const GEMINI_3_1_PRO = wrapLanguageModel({
  model: google('gemini-3.1-pro-preview'),
  middleware: [loggingMiddleware],
});

export const GEMINI_3_FLASH = wrapLanguageModel({
  model: google('gemini-3-flash-preview'),
  middleware: [loggingMiddleware],
});
