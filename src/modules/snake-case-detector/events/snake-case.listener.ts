import { db } from '@/db/index.js';
import { snakeCaseTargets } from '@/db/schema.js';
import { cacheStore } from '@/utils/cache.js';
import { createLogger } from '@/utils/logger.js';
import { Message } from 'discord.js';
import { eq } from 'drizzle-orm';

const logger = createLogger('snake-case-listener');

// Configuration constants for snake_case detection
const MIN_MESSAGE_LENGTH = 5;
const MIN_UNDERSCORE_COUNT = 2;
const RESPONSE_PROBABILITY = 0.3;

// Funny responses to send when snake_case is detected
const SNAKE_CASE_RESPONSES = [
  '🐍 Encore un message en snake_case ! Le clavier fait des siennes ?',
  '⌨️ Ton clavier a décidé de faire sa vie, on dirait !',
  '🔧 Ah, la barre espace qui fait grève...',
  "🐍 sssssnak_case_détecté ! C'est un classique !",
  '⌨️ Le clavier_est_en_mode_snake_case !',
  '🎹 *tape sur le clavier* Pourquoi_tu_ne_marches_pas_correctement_?!',
  '🐍 Un message tout en underscore, magnifique !',
  '⌨️ La touche espace a encore pris des vacances !',
];

// Emoji reactions to add
const SNAKE_CASE_REACTIONS = ['🐍', '⌨️', '🔧'];

/**
 * Fetches snake_case target users for a specific guild
 */
async function querySnakeCaseTargets(
  guildId: string,
): Promise<(typeof snakeCaseTargets.$inferSelect)[]> {
  return await db
    .select()
    .from(snakeCaseTargets)
    .where(eq(snakeCaseTargets.guildId, guildId));
}

/**
 * Returns cached snake_case targets for a guild
 */
async function getCachedTargets(guildId: string) {
  const cacheKey = `snake-case-targets-${guildId}`;
  const cacheEntry = cacheStore.useCache<
    (typeof snakeCaseTargets.$inferSelect)[]
  >(cacheKey, () => querySnakeCaseTargets(guildId));

  return (await cacheEntry.get()) ?? [];
}

/**
 * Invalidate the cached targets for a guild.
 * Call this after modifications to snake_case targets to refresh the cache.
 */
export async function invalidateSnakeCaseCache(guildId: string) {
  const cacheKey = `snake-case-targets-${guildId}`;
  const cacheEntry = cacheStore.useCache(cacheKey);
  await cacheEntry.revalidate();
}

/**
 * Detects if a message is written in snake_case
 * A message is considered snake_case if:
 * - It contains underscores
 * - It has more underscores than spaces (accounting for no spaces at all)
 * - The message has at least 2 words separated by underscores
 */
function isSnakeCaseMessage(content: string): boolean {
  // Ignore short messages
  if (content.length < MIN_MESSAGE_LENGTH) return false;

  // Count underscores and spaces
  const underscoreCount = (content.match(/_/g) ?? []).length;
  const spaceCount = (content.match(/ /g) ?? []).length;

  // Must have at least MIN_UNDERSCORE_COUNT underscores to be considered snake_case
  if (underscoreCount < MIN_UNDERSCORE_COUNT) return false;

  // More underscores than spaces (or no spaces at all)
  if (underscoreCount <= spaceCount) return false;

  // Check if there are word patterns separated by underscores
  // Match patterns like "word_word" or "word_word_word"
  const snakeCasePattern = /\w+(_\w+)+/;
  return snakeCasePattern.test(content);
}

/**
 * Main listener for snake_case messages
 */
export async function snakeCaseMessageListener(
  message: Message,
): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only process messages in guilds
  if (!message.guildId) return;

  // Check if the message author is a target
  const targets = await getCachedTargets(message.guildId);
  const isTarget = targets.some((t) => t.userId === message.author.id);

  if (!isTarget) return;

  // Check if the message is in snake_case
  if (!isSnakeCaseMessage(message.content)) return;

  logger.info(
    {
      userId: message.author.id,
      guildId: message.guildId,
      messageContent: message.content.substring(0, 50),
    },
    'Snake_case message detected!',
  );

  // Add a random reaction
  const randomReaction =
    SNAKE_CASE_REACTIONS[
      Math.floor(Math.random() * SNAKE_CASE_REACTIONS.length)
    ];
  await message.react(randomReaction).catch((error: unknown) => {
    logger.error({ error }, 'Failed to add reaction');
  });

  // RESPONSE_PROBABILITY chance to also reply with a funny message
  if (Math.random() < RESPONSE_PROBABILITY) {
    const randomResponse =
      SNAKE_CASE_RESPONSES[
        Math.floor(Math.random() * SNAKE_CASE_RESPONSES.length)
      ];
    await message.reply(randomResponse).catch((error: unknown) => {
      logger.error({ error }, 'Failed to send reply');
    });
  }
}
