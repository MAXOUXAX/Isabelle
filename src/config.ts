import { createLogger } from '@/utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  SCHEDULE_URL,
  GOOGLE_GENERATIVE_AI_API_KEY,
  LOG_LEVEL,
} = process.env;

const logger = createLogger('config');

if (
  !DISCORD_TOKEN ||
  !DISCORD_CLIENT_ID ||
  !SCHEDULE_URL ||
  !GOOGLE_GENERATIVE_AI_API_KEY
) {
  logger.error(
    'Oops! Some environment variables are missing. Please check your .env file.',
  );
  const missingVars = [
    !DISCORD_TOKEN && 'DISCORD_TOKEN',
    !DISCORD_CLIENT_ID && 'DISCORD_CLIENT_ID',
    !SCHEDULE_URL && 'SCHEDULE_URL',
    !GOOGLE_GENERATIVE_AI_API_KEY && 'GOOGLE_GENERATIVE_AI_API_KEY',
  ].filter(Boolean);

  logger.error(`Missing environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

export const config = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  SCHEDULE_URL,
  GOOGLE_GENERATIVE_AI_API_KEY,
  LOG_LEVEL,
};
