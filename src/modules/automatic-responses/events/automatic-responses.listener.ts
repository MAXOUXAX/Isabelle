import { db } from '@/db/index.js';
import { automaticResponses } from '@/db/schema.js';
import { cacheStore } from '@/utils/cache.js';
import { Message } from 'discord.js';
import { eq, isNull } from 'drizzle-orm';

/**
 * Fetches automatic response definitions scoped to a specific guild or global (guild-agnostic) responses.
 *
 * Behavior:
 * - When a non-empty guildId is provided, returns all automatic responses whose `guildId` matches the argument.
 * - When `guildId` is `null`, returns only the global automatic responses
 *
 * @param guildId The guild identifier to scope results to, or `null` to fetch global responses.
 * @returns A promise resolving to the list of matching automatic response records.
 */
async function queryAutomaticResponses(
  guildId: string | null,
): Promise<(typeof automaticResponses.$inferSelect)[]> {
  return await db
    .select()
    .from(automaticResponses)
    .where(
      guildId
        ? eq(automaticResponses.guildId, guildId)
        : isNull(automaticResponses.guildId),
    );
}

/**
 * Returns cached responses for a guild (or global if guildId is null).
 */
async function getCachedResponses(guildId: string | null) {
  const globalCacheKey = `automatic-responses-global`;
  const globalCacheEntry = cacheStore.useCache<
    (typeof automaticResponses.$inferSelect)[]
  >(globalCacheKey, () => queryAutomaticResponses(null));

  if (guildId == null) {
    const globalResponses = await globalCacheEntry.get();
    return globalResponses ?? [];
  }

  // Per-guild cache (only contains guild-specific responses)
  const guildCacheKey = `automatic-responses-guild-${guildId}`;
  const guildCacheEntry = cacheStore.useCache<
    (typeof automaticResponses.$inferSelect)[]
  >(guildCacheKey, () => queryAutomaticResponses(guildId));

  const [guildResponses, globalResponses] = await Promise.all([
    guildCacheEntry.get(),
    globalCacheEntry.get(),
  ]);

  const guildArr = guildResponses ?? [];
  const globalArr = globalResponses ?? [];

  // Return combined array with guild-specific responses first for prioritization
  return [...guildArr, ...globalArr];
}

/**
 * Invalidate (revalidate) the cached responses for a guild or global.
 * Call this after modifications to automatic responses to refresh the cache.
 * @param guildId The guild ID to invalidate the cache for, or null for global responses
 */
export async function invalidateResponseCache(guildId: string | null) {
  if (guildId == null) {
    const globalEntry = cacheStore.useCache('automatic-responses-global');
    await globalEntry.revalidate();
    return;
  }

  const guildKey = `automatic-responses-guild-${guildId}`;
  const guildEntry = cacheStore.useCache(guildKey);
  await guildEntry.revalidate();
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
  const { triggers, responses } = responseConfig.configuration;
  const probability = responseConfig.probability;

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
