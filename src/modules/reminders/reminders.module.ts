import { db } from '@/db/index.js';
import { reminders } from '@/db/schema.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import { eq, lt } from 'drizzle-orm';
import { RemindCommand } from './commands/remind.command.js';

const logger = createLogger('module:reminders');

export class RemindersModule extends IsabelleModule {
  readonly name = 'Reminders';

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

  private async checkReminders() {
    try {
      // Dynamic import to avoid circular dependency with index.ts
      const { client } = await import('@/index.js');
      if (!client.isReady()) return;

      const now = new Date();
      const dueReminders = await db
        .select()
        .from(reminders)
        .where(lt(reminders.dueAt, now));

      for (const reminder of dueReminders) {
        try {
          const channel = await client.channels.fetch(reminder.channelId);
          if (channel?.isSendable()) {
            await channel.send({
              content: `🔔 **Rappel** pour <@${reminder.userId}> :\n> ${reminder.message}`,
            });
          } else {
            logger.warn(
              { reminderId: reminder.id },
              'Channel not found or not sendable for reminder',
            );
          }
        } catch (error) {
          logger.error(
            { error, reminderId: reminder.id },
            'Failed to send reminder',
          );
        }

        // Always delete to prevent loop
        await db.delete(reminders).where(eq(reminders.id, reminder.id));
      }
    } catch (error) {
      logger.error({ error }, 'Error in checkReminders loop');
    }
  }
}
