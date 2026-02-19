import { db } from '@/db/index.js';
import { reminders } from '@/db/schema.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import { and, asc, eq, gt, lte, or } from 'drizzle-orm';
import { RemindCommand } from './commands/remind.command.js';

const logger = createLogger('module:reminders');
const REMINDER_CHECK_INTERVAL_MS = 30 * 1000;
const REMINDER_BATCH_SIZE = 50;
type ReminderRow = typeof reminders.$inferSelect;

export class RemindersModule extends IsabelleModule {
  readonly name = 'Reminders';
  private isChecking = false;
  private clientPromise?: Promise<(typeof import('@/index.js'))['client']>;

  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Maxence',
        githubUsername: 'MAXOUXAX',
      },
    ];
  }

  init(): void {
    this.registerCommands([new RemindCommand()]);

    setInterval(() => {
      void this.checkReminders();
    }, REMINDER_CHECK_INTERVAL_MS);
  }

  private async getClient(): Promise<(typeof import('@/index.js'))['client']> {
    // Dynamic import to avoid circular dependency with index.ts, cached once.
    this.clientPromise ??= import('@/index.js').then((module) => module.client);

    return this.clientPromise;
  }

  private async checkReminders() {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;

    try {
      const client = await this.getClient();
      if (!client.isReady()) return;

      const now = new Date();
      let lastSeenDueAt: Date | null = null;
      let lastSeenId: number | null = null;

      for (;;) {
        let dueReminders: ReminderRow[];

        if (lastSeenDueAt === null || lastSeenId === null) {
          dueReminders = await db
            .select()
            .from(reminders)
            .where(lte(reminders.dueAt, now))
            .orderBy(asc(reminders.dueAt), asc(reminders.id))
            .limit(REMINDER_BATCH_SIZE);
        } else {
          dueReminders = await db
            .select()
            .from(reminders)
            .where(
              and(
                lte(reminders.dueAt, now),
                or(
                  gt(reminders.dueAt, lastSeenDueAt),
                  and(
                    eq(reminders.dueAt, lastSeenDueAt),
                    gt(reminders.id, lastSeenId),
                  ),
                ),
              ),
            )
            .orderBy(asc(reminders.dueAt), asc(reminders.id))
            .limit(REMINDER_BATCH_SIZE);
        }

        if (dueReminders.length === 0) {
          break;
        }

        for (const reminder of dueReminders) {
          try {
            const channel = await client.channels.fetch(reminder.channelId);
            if (channel?.isSendable()) {
              await channel.send({
                content: `🔔 **Rappel** pour <@${reminder.userId}> :\n> ${reminder.message}`,
                allowedMentions: {
                  users: [reminder.userId],
                  roles: [],
                  repliedUser: false,
                  parse: [],
                },
              });

              await db.delete(reminders).where(eq(reminders.id, reminder.id));
            } else {
              logger.warn(
                { reminderId: reminder.id },
                'Channel not found or not sendable for reminder',
              );

              // Permanent non-sendable state: remove reminder to avoid infinite retries.
              await db.delete(reminders).where(eq(reminders.id, reminder.id));
            }
          } catch (error) {
            logger.error(
              { error, reminderId: reminder.id },
              'Failed to send reminder',
            );
          }
        }

        const lastReminderInBatch = dueReminders.at(-1);
        if (!lastReminderInBatch) {
          break;
        }

        lastSeenDueAt = lastReminderInBatch.dueAt;
        lastSeenId = lastReminderInBatch.id;
      }
    } catch (error) {
      logger.error({ error }, 'Error in checkReminders loop');
    } finally {
      this.isChecking = false;
    }
  }
}
