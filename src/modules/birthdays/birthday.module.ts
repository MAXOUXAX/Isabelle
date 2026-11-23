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
  private isDestroyed = false;
  private isCheckRunning = false;

  init(): void {
    this.isDestroyed = false;
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
    this.isDestroyed = true;
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
    if (this.isDestroyed) {
      return;
    }

    const now = new Date();
    const next = this.scheduledTimeFor(now);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    this.dailyTimeout = setTimeout(() => {
      void (async () => {
        await this.runDailyCheck();
        this.scheduleNextCheck();
      })();
    }, next.getTime() - now.getTime());
  }

  private async runDailyCheck(): Promise<void> {
    // Guard against overlapping runs (startup catch-up + timer) so a birthday is
    // never announced twice before `lastNotified` is persisted.
    if (this.isDestroyed || this.isCheckRunning) {
      return;
    }

    this.isCheckRunning = true;
    try {
      await announceBirthdays();
    } catch (error) {
      logger.error({ error }, 'Birthday announcement check failed');
    } finally {
      this.isCheckRunning = false;
    }
  }
}
