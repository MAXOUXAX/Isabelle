import { db } from '@/db/index.js';
import { automaticResponses } from '@/db/schema.js';
import { cacheStore } from '@/utils/cache.js';
import { Message } from 'discord.js';
import { eq, isNull } from 'drizzle-orm';

// Cache compiled regexes to avoid recompilation on every message
const triggerRegexCache = new Map<string, RegExp>();
// Track which scope(s) (guild/global) each trigger belongs to for granular invalidation
const triggerScopesCache = new Map<string, Set<string>>();
const AUTOMATIC_RESPONSES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getScopeKey(guildId: string | null): string {
  return guildId == null ? 'global' : `guild:${guildId}`;
}

function registerTriggerScope(trigger: string, guildId: string | null): void {
  const scopeKey = getScopeKey(guildId);
  const scopes = triggerScopesCache.get(trigger);

  if (!scopes) {
    triggerScopesCache.set(trigger, new Set([scopeKey]));
    return;
  }

  scopes.add(scopeKey);
}

function invalidateRegexCacheForScope(guildId: string | null): void {
  const scopeKey = getScopeKey(guildId);

  for (const [trigger, scopes] of triggerScopesCache) {
    scopes.delete(scopeKey);

    if (scopes.size === 0) {
      triggerScopesCache.delete(trigger);
      triggerRegexCache.delete(trigger);
    }
  }
}

function getOrCreateTriggerPattern(trigger: string): RegExp {
  const cachedPattern = triggerRegexCache.get(trigger);
  if (cachedPattern) {
    return cachedPattern;
  }

  const pattern = new RegExp(`(?:^|\\s)${escapeRegex(trigger)}(?:\\s|$)`, 'i');
  triggerRegexCache.set(trigger, pattern);
  return pattern;
}

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
  // Cache global responses for 24 hours
  const globalCacheEntry = cacheStore.useCache<
    (typeof automaticResponses.$inferSelect)[]
  >(
    globalCacheKey,
    () => queryAutomaticResponses(null),
    AUTOMATIC_RESPONSES_CACHE_TTL_MS,
  );

  if (guildId == null) {
    const globalResponses = await globalCacheEntry.get();
    return globalResponses ?? [];
  }

  // Per-guild cache (only contains guild-specific responses)
  const guildCacheKey = `automatic-responses-guild-${guildId}`;
  // Cache guild responses for 24 hours
  const guildCacheEntry = cacheStore.useCache<
    (typeof automaticResponses.$inferSelect)[]
  >(
    guildCacheKey,
    () => queryAutomaticResponses(guildId),
    AUTOMATIC_RESPONSES_CACHE_TTL_MS,
  );

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
  // Invalidate only regexes associated with the updated scope (guild/global)
  invalidateRegexCacheForScope(guildId);

  if (guildId == null) {
    const globalEntry = cacheStore.useCache('automatic-responses-global');
    await globalEntry.revalidate();
    return;
  }

  const guildKey = `automatic-responses-guild-${guildId}`;
  const guildEntry = cacheStore.useCache(guildKey);
  await guildEntry.revalidate();
}

/**
 * Invalidate cache for the scope owning a specific automatic response row.
 * Useful for update/delete flows where only the row ID is known.
 * @param responseId Automatic response row ID
 */
export async function invalidateResponseCacheByResponseId(
  responseId: number,
  fallbackGuildId: string | null = null,
): Promise<void> {
  const rows = await db
    .select({ guildId: automaticResponses.guildId })
    .from(automaticResponses)
    .where(eq(automaticResponses.id, responseId))
    .limit(1);

  if (rows.length === 0) {
    await invalidateResponseCache(fallbackGuildId);
    return;
  }

  await invalidateResponseCache(rows[0].guildId);
}

export async function automaticResponseMessageListener(
  message: Message,
): Promise<void> {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // Fetch both global (guildId is NULL) and guild-specific responses, using cache
  const applicableResponses = await getCachedResponses(message.guildId ?? null);

  if (applicableResponses.length === 0) {
    return;
  }

  for (const responseConfig of applicableResponses) {
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
 * @param content The lowercase content of the message
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

  let hasTrigger = false;

  for (const trigger of triggers) {
    registerTriggerScope(trigger, responseConfig.guildId);

    if (!hasTrigger) {
      const pattern = getOrCreateTriggerPattern(trigger);
      hasTrigger = pattern.test(content);
    }
  }

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
