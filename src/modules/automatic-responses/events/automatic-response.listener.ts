import { db } from '@/db/index.js';
import { automaticResponses } from '@/db/schema.js';
import { Cache } from '@/utils/cache.js';
import { Message } from 'discord.js';
import { eq, isNull, or } from 'drizzle-orm';

// 24 hours in milliseconds
const RESPONSE_CACHE_TTL = 24 * 60 * 60 * 1000;

// Exported cache instance for external invalidation
export const responseCache = new Cache<
  string,
  (typeof automaticResponses.$inferSelect)[]
>({ ttlMs: RESPONSE_CACHE_TTL });

async function getCachedResponses(guildId: string | null) {
  const cacheKey = guildId ?? 'global';
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from DB
  const responses = await db
    .select()
    .from(automaticResponses)
    .where(
      guildId
        ? or(
            eq(automaticResponses.guildId, guildId),
            isNull(automaticResponses.guildId),
          )
        : isNull(automaticResponses.guildId),
    );
  responseCache.set(cacheKey, responses);
  return responses;
}

export async function automaticResponseMessageListener(
  message: Message,
): Promise<void> {
  if (message.author.bot) return;

  const content = ` ${message.content.toLowerCase()} `; // pad with spaces for word boundary matching

  // Fetch both global (guildId is NULL) and guild-specific responses, using cache
  const applicableResponses = await getCachedResponses(message.guildId ?? null);

  if (applicableResponses.length === 0) {
    return;
  }

  // Prioritized list: guild-specific responses first, then global ones
  const prioritizedResponses = [
    ...applicableResponses.filter((r) => r.guildId === message.guildId),
    ...applicableResponses.filter((r) => r.guildId === null),
  ];

  for (const responseConfig of prioritizedResponses) {
    const responded = await checkAndSendResponse(
      message,
      content,
      responseConfig,
    );

    if (responded) {
      return;
    }
  }
}

/**
 * Checks if a message matches triggers and sends a response if it does
 * @param message The Discord message to potentially respond to
 * @param content The lowercase content of the message (padded with spaces)
 * @param responseConfig The automatic response configuration from the database
 * @returns True if a response was sent, false otherwise
 */
async function checkAndSendResponse(
  message: Message,
  content: string,
  responseConfig: typeof automaticResponses.$inferSelect,
): Promise<boolean> {
  let { triggers } = responseConfig.configuration;
  const { responses } = responseConfig.configuration;
  const probability = responseConfig.probability;

  // Normalize triggers to lowercase
  triggers = triggers.map((t) => t.toLowerCase());

  if (triggers.length === 0 || responses.length === 0) {
    return false;
  }

  // Improved trigger matching: match only whole words (with word boundaries)
  const hasTrigger = triggers.some((t) => {
    // Pad trigger with spaces for strict word boundary
    const pattern = new RegExp(`\\b${escapeRegex(t)}\\b`, 'i');
    return pattern.test(content);
  });

  if (!hasTrigger) {
    return false;
  }

  // Probability check after trigger match
  if (Math.random() * 100 >= probability) {
    return false;
  }

  const randomResponse =
    responses[Math.floor(Math.random() * responses.length)];

  await message.reply(randomResponse);
  return true;
}

// Helper to escape regex special characters in triggers
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
