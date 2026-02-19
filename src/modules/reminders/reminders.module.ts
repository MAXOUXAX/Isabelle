import { db } from '@/db/index.js';
import { reminders } from '@/db/schema.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import { eq, lte } from 'drizzle-orm';
import { RemindCommand } from './commands/remind.command.js';

const logger = createLogger('module:reminders');

export class RemindersModule extends IsabelleModule {
  readonly name = 'Reminders';
  private isChecking = false;
  private clientPromise?: Promise<(typeof import('@/index.js'))['client']>;

  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Jules',
        githubUsername: 'Jules',
      },
    ];
  }

  init(): void {
    this.registerCommands([new RemindCommand()]);

    setInterval(() => {
      void this.checkReminders();
    }, 30 * 1000); // Check every 30 seconds
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
      const dueReminders = await db
        .select()
        .from(reminders)
        .where(lte(reminders.dueAt, now));

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
    } catch (error) {
      logger.error({ error }, 'Error in checkReminders loop');
    } finally {
      this.isChecking = false;
    }
  }
}
