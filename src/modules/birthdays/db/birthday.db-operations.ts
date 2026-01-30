import { db } from '@/db/index.js';
import { birthdays } from '@/db/schema.js';
import { createLogger } from '@/utils/logger.js';
import { and, eq } from 'drizzle-orm';

const logger = createLogger('birthdays-db');

export async function setBirthday(
  userId: string,
  day: number,
  month: number,
  year?: number,
): Promise<void> {
  try {
    await db
      .insert(birthdays)
      .values({
        userId,
        day,
        month,
        year: year ?? null,
      })
      .onConflictDoUpdate({
        target: [birthdays.userId],
        set: {
          day,
          month,
          year: year ?? null,
        },
      });
  } catch (error) {
    logger.error({ error }, 'Failed to set birthday');
    throw error;
  }
}

export async function removeBirthday(userId: string): Promise<boolean> {
  try {
    const result = await db
      .delete(birthdays)
      .where(eq(birthdays.userId, userId))
      .returning();
    return result.length > 0;
  } catch (error) {
    logger.error({ error }, 'Failed to remove birthday');
    throw error;
  }
}

export async function getBirthday(
  userId: string,
): Promise<typeof birthdays.$inferSelect | null> {
  try {
    const result = await db
      .select()
      .from(birthdays)
      .where(eq(birthdays.userId, userId));

    return result[0] ?? null;
  } catch (error) {
    logger.error({ error }, 'Failed to get birthday');
    throw error;
  }
}

export async function getBirthdaysByDate(day: number, month: number) {
  try {
    const result = await db
      .select()
      .from(birthdays)
      .where(and(eq(birthdays.day, day), eq(birthdays.month, month)));
    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to get birthdays by date');
    throw error;
  }
}
