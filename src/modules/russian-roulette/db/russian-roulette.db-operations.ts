import { db } from '@/db/index.js';
import { russianRouletteStats } from '@/db/schema.js';
import { createLogger } from '@/utils/logger.js';
import { sql } from 'drizzle-orm';

const logger = createLogger('russian-roulette-db-operations');

/**
 * Increments the play count for a user in the database.
 * A play is counted when a user executes /roulette-russe jouer.
 */
export async function incrementPlays(
  guildId: string,
  userId: string,
): Promise<void> {
  try {
    await db
      .insert(russianRouletteStats)
      .values({
        guildId,
        userId,
        plays: 1,
      })
      .onConflictDoUpdate({
        target: [russianRouletteStats.guildId, russianRouletteStats.userId],
        set: {
          plays: sql`plays + 1`,
        },
      });
  } catch (error) {
    logger.error({ error }, 'Failed to increment plays count');
  }
}

/**
 * Increments the shot count for a user in the database.
 * A shot is counted when the user's play resulted in someone getting hit.
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
      })
      .onConflictDoUpdate({
        target: [russianRouletteStats.guildId, russianRouletteStats.userId],
        set: {
          shots: sql`shots + 1`,
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
        deaths: 1,
        timeoutMinutes,
      })
      .onConflictDoUpdate({
        target: [russianRouletteStats.guildId, russianRouletteStats.userId],
        set: {
          deaths: sql`deaths + 1`,
          timeoutMinutes: sql`timeout_minutes + ${timeoutMinutes}`,
        },
      });
  } catch (error) {
    logger.error({ error }, 'Failed to increment deaths count');
  }
}
