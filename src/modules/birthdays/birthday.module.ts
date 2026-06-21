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

    // Catch up on startup in case the bot was offline at the scheduled time.
    // The check is idempotent, so this won't double-announce.
    void this.runDailyCheck();
    this.scheduleNextCheck();
  }

  destroy(): void {
    if (this.dailyTimeout) {
      clearTimeout(this.dailyTimeout);
      this.dailyTimeout = null;
    }
  }

  private scheduleNextCheck(): void {
    const now = new Date();
    const next = new Date(now);
    next.setHours(ANNOUNCEMENT_HOUR, ANNOUNCEMENT_MINUTE, 0, 0);

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
