import { db } from '@/db/index.js';
import { russianRouletteStats } from '@/db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';

export interface RussianRouletteStats {
  userId: string;
  guildId: string;
  shotsFired: number;
  deaths: number;
  currentStreak: number;
  highestStreak: number;
}

export interface LeaderboardEntry {
  userId: string;
  shotsFired: number;
  deaths: number;
  currentStreak: number;
  highestStreak: number;
}

export class RussianRouletteRepository {
  /**
   * Records a shot fired by a user (increments streak)
   */
  async recordShotFired(userId: string, guildId: string): Promise<void> {
    try {
      // First, try to find existing stats
      const existingStats = await db
        .select()
        .from(russianRouletteStats)
        .where(
          and(
            eq(russianRouletteStats.userId, userId),
            eq(russianRouletteStats.guildId, guildId),
          ),
        )
        .limit(1);

      if (existingStats.length > 0) {
        // Update existing record - increment shots and current streak
        const newCurrentStreak = existingStats[0].currentStreak + 1;
        const newHighestStreak = Math.max(
          existingStats[0].highestStreak,
          newCurrentStreak,
        );

        await db
          .update(russianRouletteStats)
          .set({
            shotsFired: existingStats[0].shotsFired + 1,
            currentStreak: newCurrentStreak,
            highestStreak: newHighestStreak,
            updatedAt: sql`(current_timestamp)`,
          })
          .where(
            and(
              eq(russianRouletteStats.userId, userId),
              eq(russianRouletteStats.guildId, guildId),
            ),
          );
      } else {
        // Create new record - first shot gives streak of 1
        await db.insert(russianRouletteStats).values({
          userId,
          guildId,
          shotsFired: 1,
          deaths: 0,
          currentStreak: 1,
          highestStreak: 1,
        });
      }
    } catch (error) {
      console.error('Failed to record shot fired:', error);
    }
  }

  /**
   * Records a death/hit for a user (resets current streak to 0)
   */
  async recordDeath(userId: string, guildId: string): Promise<void> {
    try {
      // First, try to find existing stats
      const existingStats = await db
        .select()
        .from(russianRouletteStats)
        .where(
          and(
            eq(russianRouletteStats.userId, userId),
            eq(russianRouletteStats.guildId, guildId),
          ),
        )
        .limit(1);

      if (existingStats.length > 0) {
        // Update existing record - increment deaths and reset current streak
        await db
          .update(russianRouletteStats)
          .set({
            deaths: existingStats[0].deaths + 1,
            currentStreak: 0, // Reset streak when hit
            updatedAt: sql`(current_timestamp)`,
          })
          .where(
            and(
              eq(russianRouletteStats.userId, userId),
              eq(russianRouletteStats.guildId, guildId),
            ),
          );
      } else {
        // Create new record (user was hit without firing first)
        await db.insert(russianRouletteStats).values({
          userId,
          guildId,
          shotsFired: 0,
          deaths: 1,
          currentStreak: 0,
          highestStreak: 0,
        });
      }
    } catch (error) {
      console.error('Failed to record death:', error);
    }
  }

  /**
   * Gets leaderboard data for a guild, sorted by highest streak
   */
  async getLeaderboard(
    guildId: string,
    limit = 10,
  ): Promise<LeaderboardEntry[]> {
    try {
      const results = await db
        .select({
          userId: russianRouletteStats.userId,
          shotsFired: russianRouletteStats.shotsFired,
          deaths: russianRouletteStats.deaths,
          currentStreak: russianRouletteStats.currentStreak,
          highestStreak: russianRouletteStats.highestStreak,
        })
        .from(russianRouletteStats)
        .where(eq(russianRouletteStats.guildId, guildId))
        .orderBy(desc(russianRouletteStats.highestStreak))
        .limit(limit);

      return results;
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  /**
   * Gets stats for a specific user in a guild
   */
  async getUserStats(
    userId: string,
    guildId: string,
  ): Promise<RussianRouletteStats | null> {
    try {
      const results = await db
        .select()
        .from(russianRouletteStats)
        .where(
          and(
            eq(russianRouletteStats.userId, userId),
            eq(russianRouletteStats.guildId, guildId),
          ),
        )
        .limit(1);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return null;
    }
  }
}
