import { db } from '@/db/index.js';
import { birthdays } from '@/db/schema.js';
import { and, eq, inArray } from 'drizzle-orm';

class BirthdayRepository {
  setBirthday(guildId: string, userId: string, month: number, day: number) {
    return db
      .insert(birthdays)
      .values({
        guildId,
        userId,
        month,
        day,
      })
      .onConflictDoUpdate({
        target: [birthdays.guildId, birthdays.userId],
        // Reset the notification marker so a corrected date still gets announced.
        set: { month, day, lastNotified: null },
      });
  }

  removeBirthday(guildId: string, userId: string) {
    return db
      .delete(birthdays)
      .where(and(eq(birthdays.guildId, guildId), eq(birthdays.userId, userId)));
  }

  listBirthdays(guildId: string) {
    return db.select().from(birthdays).where(eq(birthdays.guildId, guildId));
  }

  /**
   * Returns every birthday matching a given day, across all guilds.
   * Used by the daily announcement job.
   */
  getBirthdaysForDay(month: number, day: number) {
    return db
      .select()
      .from(birthdays)
      .where(and(eq(birthdays.month, month), eq(birthdays.day, day)));
  }

  markBirthdaysNotified(ids: number[], notifiedAt: Date) {
    if (ids.length === 0) {
      return Promise.resolve();
    }

    return db
      .update(birthdays)
      .set({ lastNotified: notifiedAt })
      .where(inArray(birthdays.id, ids));
  }
}

export const birthdayRepository = new BirthdayRepository();
