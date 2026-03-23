import { db } from '@/db/index.js';
import { reminders } from '@/db/schema.js';
import { and, asc, eq, gt, lte, or, sql } from 'drizzle-orm';
import type { ReminderCursor, UserReminder } from './reminder.types.js';

const QUEUED_REMINDER_STATUS = 'queued';
const PROCESSING_REMINDER_STATUS = 'processing';
const REMINDER_CLAIMER_ID = `isabelle:${String(process.pid)}`;

export const getUserReminders = (
  userId: string,
  guildId: string,
): Promise<UserReminder[]> => {
  return db
    .select({
      id: reminders.id,
      message: reminders.message,
      dueAt: reminders.dueAt,
    })
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.guildId, guildId),
        eq(reminders.status, QUEUED_REMINDER_STATUS),
      ),
    )
    .orderBy(asc(reminders.dueAt), asc(reminders.id))
    .limit(25) as Promise<UserReminder[]>;
};

export const getUserReminderById = async (
  reminderId: number,
  userId: string,
  guildId: string,
) => {
  const rows = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.userId, userId),
        eq(reminders.guildId, guildId),
        eq(reminders.status, QUEUED_REMINDER_STATUS),
      ),
    )
    .limit(1);

  const reminder = rows.at(0);

  return reminder ?? null;
};

export const getDueReminders = (
  now: Date,
  cursor: ReminderCursor,
  limit: number,
): Promise<(typeof reminders.$inferSelect)[]> => {
  const cursorFilter =
    cursor.dueAt === null || cursor.id === null
      ? lte(reminders.dueAt, now)
      : and(
          lte(reminders.dueAt, now),
          or(
            gt(reminders.dueAt, cursor.dueAt),
            and(eq(reminders.dueAt, cursor.dueAt), gt(reminders.id, cursor.id)),
          ),
        );

  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.status, QUEUED_REMINDER_STATUS), cursorFilter))
    .orderBy(asc(reminders.dueAt), asc(reminders.id))
    .limit(limit);
};

export const claimReminder = async (reminderId: number) => {
  const claimedReminders = await db
    .update(reminders)
    .set({
      attempts: sql`${reminders.attempts} + 1`,
      claimedAt: new Date(),
      claimedBy: REMINDER_CLAIMER_ID,
      status: PROCESSING_REMINDER_STATUS,
    })
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.status, QUEUED_REMINDER_STATUS),
      ),
    )
    .returning();

  const claimedReminder = claimedReminders.at(0);

  return claimedReminder ?? null;
};

export const requeueReminder = (reminderId: number, dueAt: Date) => {
  return db
    .update(reminders)
    .set({
      claimedAt: null,
      claimedBy: null,
      dueAt,
      status: QUEUED_REMINDER_STATUS,
    })
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.status, PROCESSING_REMINDER_STATUS),
      ),
    );
};

export const createReminder = (
  reminder: Pick<
    typeof reminders.$inferInsert,
    'userId' | 'guildId' | 'channelId' | 'message' | 'dueAt'
  >,
) => {
  return db.insert(reminders).values(reminder);
};

export const updateReminder = (
  reminderId: number,
  updates: {
    dueAt?: Date;
    message?: string;
  },
) => {
  const safeUpdates: {
    dueAt?: Date;
    message?: string;
  } = {};

  if (updates.dueAt !== undefined) {
    safeUpdates.dueAt = updates.dueAt;
  }

  if (updates.message !== undefined) {
    safeUpdates.message = updates.message;
  }

  if (Object.keys(safeUpdates).length === 0) {
    return Promise.resolve(null);
  }

  return db
    .update(reminders)
    .set(safeUpdates)
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.status, QUEUED_REMINDER_STATUS),
      ),
    )
    .returning()
    .then((updatedReminders) => updatedReminders.at(0) ?? null);
};

export const deleteReminder = (reminderId: number) => {
  return db.delete(reminders).where(eq(reminders.id, reminderId));
};
