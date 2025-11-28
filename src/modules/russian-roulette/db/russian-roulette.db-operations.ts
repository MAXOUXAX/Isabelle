import { db } from '@/db/index.js';
import { russianRouletteStats } from '@/db/schema.js';
import { createLogger } from '@/utils/logger.js';
import { sql } from 'drizzle-orm';

const logger = createLogger('russian-roulette-db-operations');

/**
 * Increments the shot count for a user in the database.
 */
export async function incrementShots(
  guildId: string,
  userId: string,
): Promise<void> {
  try {
    await db
      .insert(russianRouletteStats)
      .values({
        guildId,
        userId,
        shots: 1,
        deaths: 0,
        updatedAt: sql`(unixepoch())`,
      })
      .onConflictDoUpdate({
        target: [russianRouletteStats.guildId, russianRouletteStats.userId],
        set: {
          shots: sql`shots + 1`,
          updatedAt: sql`(unixepoch())`,
        },
      });
  } catch (error) {
    logger.error({ error }, 'Failed to increment shots count');
  }
}

/**
 * Increments the death count and adds timeout duration for a user in the database.
 * @param guildId The guild ID
 * @param userId The user ID
 * @param timeoutMinutes The timeout duration in minutes to add
 */
export async function incrementDeaths(
  guildId: string,
  userId: string,
  timeoutMinutes: number,
): Promise<void> {
  try {
    await db
      .insert(russianRouletteStats)
      .values({
        guildId,
        userId,
        shots: 0,
        deaths: 1,
        timeoutMinutes,
        updatedAt: sql`(unixepoch())`,
      })
      .onConflictDoUpdate({
        target: [russianRouletteStats.guildId, russianRouletteStats.userId],
        set: {
          deaths: sql`deaths + 1`,
          timeoutMinutes: sql`timeout_minutes + ${timeoutMinutes}`,
          updatedAt: sql`(unixepoch())`,
        },
      });
  } catch (error) {
    logger.error({ error }, 'Failed to increment deaths count');
  }
}
