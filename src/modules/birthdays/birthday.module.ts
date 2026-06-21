import { announceBirthdays } from '@/modules/birthdays/birthday.announcer.js';
import { BirthdayCommand } from '@/modules/birthdays/commands/birthday.command.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';

const logger = createLogger('module:birthdays');

/** Time of day (local time) at which birthdays are announced. */
const ANNOUNCEMENT_HOUR = 7;
const ANNOUNCEMENT_MINUTE = 45;

export class BirthdayModule extends IsabelleModule {
  name = 'Birthdays';
  contributors: ModuleContributor[] = [
    { displayName: 'Maxence', githubUsername: 'MAXOUXAX' },
  ];

  private dailyTimeout: ReturnType<typeof setTimeout> | null = null;

  init(): void {
    this.registerCommand(new BirthdayCommand());

    // Catch up only if today's scheduled time has already passed (e.g. the bot
    // was offline at 07:45). Before that time, the scheduled timer fires today,
    // so an immediate run would only announce prematurely. The check is
    // idempotent, so this never double-announces.
    if (new Date() >= this.scheduledTimeFor(new Date())) {
      void this.runDailyCheck();
    }
    this.scheduleNextCheck();
  }

  destroy(): void {
    if (this.dailyTimeout) {
      clearTimeout(this.dailyTimeout);
      this.dailyTimeout = null;
    }
  }

  /** Today's announcement time (local) for the calendar day of `reference`. */
  private scheduledTimeFor(reference: Date): Date {
    const scheduled = new Date(reference);
    scheduled.setHours(ANNOUNCEMENT_HOUR, ANNOUNCEMENT_MINUTE, 0, 0);
    return scheduled;
  }

  private scheduleNextCheck(): void {
    const now = new Date();
    const next = this.scheduledTimeFor(now);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    this.dailyTimeout = setTimeout(() => {
      void this.runDailyCheck();
      this.scheduleNextCheck();
    }, next.getTime() - now.getTime());
  }

  private async runDailyCheck(): Promise<void> {
    try {
      await announceBirthdays();
    } catch (error) {
      logger.error({ error }, 'Birthday announcement check failed');
    }
  }
}
