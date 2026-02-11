import { db } from '@/db/index.js';
import { birthdays } from '@/db/schema.js';
import { client } from '@/index.js';
import { configManager } from '@/manager/config.manager.js';
import { createLogger } from '@/utils/logger.js';
import { and, eq, ne } from 'drizzle-orm';

const logger = createLogger('birthday-scheduler');
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function startBirthdayScheduler() {
  logger.info('Starting birthday scheduler...');
  void checkBirthdays();
  setInterval(() => {
    void checkBirthdays();
  }, CHECK_INTERVAL_MS);
}

async function checkBirthdays() {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  try {
    const todaysBirthdays = await db
      .select()
      .from(birthdays)
      .where(
        and(
          eq(birthdays.day, currentDay),
          eq(birthdays.month, currentMonth),
          ne(birthdays.lastCelebratedYear, currentYear),
        ),
      );

    if (todaysBirthdays.length === 0) {
      return;
    }

    logger.info({ count: todaysBirthdays.length }, 'Found birthdays to celebrate');

    for (const birthday of todaysBirthdays) {
      try {
        const guildId = birthday.guildId;
        const config = configManager.getGuild(guildId);

        if (!config.BIRTHDAY_CHANNEL_ID) {
          continue;
        }

        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) continue;

        const channel = await guild.channels.fetch(config.BIRTHDAY_CHANNEL_ID).catch(() => null);

        if (channel?.isTextBased()) {
             let message = `🎉 Joyeux anniversaire <@${birthday.userId}> ! 🎂`;
             if (birthday.year) {
                  const age = currentYear - birthday.year;
                  message += ` (${String(age)} ans)`;
             }

             await channel.send(message);
             logger.info({ userId: birthday.userId, guildId }, 'Sent birthday message');

             await db
                .update(birthdays)
                .set({ lastCelebratedYear: currentYear })
                .where(eq(birthdays.id, birthday.id));
        }
      } catch (error) {
        logger.error({ error, userId: birthday.userId }, 'Failed to process birthday');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error checking birthdays');
  }
}
