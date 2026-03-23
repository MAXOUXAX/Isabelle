import { db } from '@/db/index.js';
import { reminders } from '@/db/schema.js';
import { and, asc, eq, gt, lte, or } from 'drizzle-orm';
import type {
  ReminderCursor,
  ReminderRow,
  UserReminder,
} from './reminder.types.js';

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
    .where(and(eq(reminders.userId, userId), eq(reminders.guildId, guildId)))
    .orderBy(asc(reminders.dueAt), asc(reminders.id))
    .limit(25) as Promise<UserReminder[]>;
};

export const getUserReminderById = async (
  reminderId: number,
  userId: string,
  guildId: string,
) => {
  const reminders: ReminderRow[] = await db
    .select()
    .from(reminder)
    .where(
      and(
        eq(reminder.id, reminderId),
        eq(reminder.userId, userId),
        eq(reminder.guildId, guildId),
      ),
    )
    .limit(1);

  const reminder = reminders.at(0);

  return reminder ?? null;
};

export const getDueReminders = (
  now: Date,
  cursor: ReminderCursor,
  limit: number,
): Promise<ReminderRow[]> => {
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
    .where(cursorFilter)
    .orderBy(asc(reminders.dueAt), asc(reminders.id))
    .limit(limit) as Promise<ReminderRow[]>;
};

export const claimReminder = async (reminderId: number) => {
  const claimedReminders: ReminderRow[] = await db
    .delete(reminders)
    .where(eq(reminders.id, reminderId))
    .returning();

  const claimedReminder = claimedReminders.at(0);

  return claimedReminder ?? null;
};

export const requeueReminder = (reminder: ReminderRow, dueAt: Date) => {
  return db.insert(reminder).values({
    userId: reminder.userId,
    guildId: reminder.guildId,
    channelId: reminder.channelId,
    message: reminder.message,
    dueAt,
  });
};

export const createReminder = (
  reminder: Pick<
    ReminderRow,
    'userId' | 'guildId' | 'channelId' | 'message' | 'dueAt'
  >,
) => {
  return db.insert(reminder).values(reminder);
};

export const updateReminder = (
  reminderId: number,
  updates: {
    dueAt?: Date;
    message?: string;
  },
) => {
  return db.update(reminders).set(updates).where(eq(reminders.id, reminderId));
};

export const deleteReminder = (reminderId: number) => {
  return db.delete(reminders).where(eq(reminders.id, reminderId));
};
