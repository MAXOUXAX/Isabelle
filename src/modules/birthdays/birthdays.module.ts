import { client } from '@/index.js';
import { configManager } from '@/manager/config.manager.js';
import { BirthdayCommand } from '@/modules/birthdays/commands/birthday.command.js';
import { getBirthdaysByDate } from '@/modules/birthdays/db/birthday.db-operations.js';
import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import { TextChannel } from 'discord.js';

const logger = createLogger('birthdays-module');

export class BirthdaysModule extends IsabelleModule {
  readonly name = 'Birthdays';

  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Jules',
        githubUsername: 'Jules',
      },
    ];
  }

  init(): void {
    this.registerCommands([new BirthdayCommand()]);

    // Check every minute to see if it's 8:00 AM
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 8 && now.getMinutes() === 0) {
        void this.checkBirthdays();
      }
    }, 60 * 1000);
  }

  private async checkBirthdays() {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;

    try {
      let birthdays = await getBirthdaysByDate(day, month);

      // Handle leap years: if it's Feb 28th and not a leap year, include Feb 29th birthdays
      const isLeapYear = (year: number) =>
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      const currentYear = now.getFullYear();

      if (day === 28 && month === 2 && !isLeapYear(currentYear)) {
        const leapBirthdays = await getBirthdaysByDate(29, 2);
        birthdays = [...birthdays, ...leapBirthdays];
      }

      if (birthdays.length === 0) return;

      for (const guild of client.guilds.cache.values()) {
        const config = configManager.getGuild(guild.id);
        if (!config.BIRTHDAY_CHANNEL_ID) continue;

        const channel = guild.channels.cache.get(config.BIRTHDAY_CHANNEL_ID);
        if (!channel || !(channel instanceof TextChannel)) continue;

        const membersInGuild = [];
        for (const birthday of birthdays) {
          try {
            const member = await guild.members.fetch(birthday.userId);
            membersInGuild.push(member);
          } catch {
            // User not in guild
          }
        }

        if (membersInGuild.length > 0) {
          const mentions = membersInGuild.map((m) => m.toString()).join(', ');
          await channel.send(`🎉 Joyeux anniversaire à ${mentions} ! 🎂🎈`);
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error checking birthdays');
    }
  }
}
