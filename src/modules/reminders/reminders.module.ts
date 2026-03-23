import { client } from '@/index.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { ReminderChannelUnavailableError } from '@/modules/reminders/errors/channel-unavailable.error.js';
import { createLogger } from '@/utils/logger.js';
import { DiscordAPIError } from 'discord.js';
import { RemindCommand } from './commands/remind.command.js';
import {
  claimReminder,
  deleteReminder,
  getDueReminders,
  ReminderCursor,
  requeueReminder,
} from './commands/remind.shared.js';

const logger = createLogger('module:reminders');
const REMINDER_CHECK_INTERVAL_MS = 30 * 1000;
const REMINDER_BATCH_SIZE = 50;
const MAX_REMINDERS_PER_TICK = REMINDER_BATCH_SIZE;

export class RemindersModule extends IsabelleModule {
  readonly name = 'Reminders';
  private isChecking = false;
  private reminderInterval: ReturnType<typeof setInterval> | null = null;

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

    this.reminderInterval = setInterval(() => {
      void this.checkReminders();
    }, REMINDER_CHECK_INTERVAL_MS);
  }

  destroy(): void {
    if (!this.reminderInterval) {
      return;
    }

    clearInterval(this.reminderInterval);
    this.reminderInterval = null;
  }

  private async checkReminders(): Promise<void> {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;

    try {
      const now = new Date();
      const cursor: ReminderCursor = {
        dueAt: null,
        id: null,
      };
      let processedReminderCount = 0;

      for (;;) {
        if (processedReminderCount >= MAX_REMINDERS_PER_TICK) {
          logger.info(
            { processedReminderCount },
            'Reached reminder processing cap for this tick; remaining reminders will be handled later',
          );
          break;
        }

        const dueReminders = await getDueReminders(
          now,
          cursor,
          Math.min(
            REMINDER_BATCH_SIZE,
            MAX_REMINDERS_PER_TICK - processedReminderCount,
          ),
        );

        if (dueReminders.length === 0) {
          break;
        }

        for (const reminder of dueReminders) {
          let claimedReminder = null;

          try {
            claimedReminder = await claimReminder(reminder.id);

            if (!claimedReminder) {
              continue;
            }

            processedReminderCount++;

            const channel = await client.channels.fetch(
              claimedReminder.channelId,
            );
            if (!channel?.isSendable()) {
              throw new ReminderChannelUnavailableError(
                claimedReminder.channelId,
              );
            }

            await channel.send({
              content: `🔔 **Rappel** pour <@${claimedReminder.userId}> :\n> ${claimedReminder.message}`,
              allowedMentions: {
                users: [claimedReminder.userId],
                roles: [],
                repliedUser: false,
                parse: [],
              },
            });

            try {
              await deleteReminder(claimedReminder.id);
            } catch (cleanupError) {
              logger.error(
                { error: cleanupError, reminderId: claimedReminder.id },
                'Reminder delivered but failed to delete the claimed row',
              );
            }
          } catch (error) {
            if (claimedReminder && !this.isPermanentReminderFailure(error)) {
              try {
                await requeueReminder(
                  claimedReminder.id,
                  new Date(Date.now() + REMINDER_CHECK_INTERVAL_MS),
                );
              } catch (requeueError) {
                logger.error(
                  { error: requeueError, reminderId: claimedReminder.id },
                  'Failed to requeue reminder after send failure',
                );
              }
            }

            if (this.isPermanentReminderFailure(error)) {
              logger.warn(
                { error, reminderId: claimedReminder?.id ?? reminder.id },
                'Dropping reminder due to permanent Discord API error',
              );
              continue;
            }

            logger.error(
              { error, reminderId: claimedReminder?.id ?? reminder.id },
              'Failed to send reminder',
            );
          }
        }

        const lastReminderInBatch = dueReminders[dueReminders.length - 1];

        cursor.dueAt = lastReminderInBatch.dueAt;
        cursor.id = lastReminderInBatch.id;
      }
    } catch (error) {
      logger.error({ error }, 'Error in checkReminders loop');
    } finally {
      this.isChecking = false;
    }
  }

  private isPermanentReminderFailure(error: unknown): boolean {
    if (!(error instanceof DiscordAPIError)) {
      return false;
    }

    return error.code === 10003 || error.code === 50001 || error.code === 50013;
  }
}
