import { client } from '@/index.js';
import { db } from '@/db/index.js';
import { birthdays } from '@/db/schema.js';
import { createLogger } from '@/utils/logger.js';
import { TextChannel } from 'discord.js';

const logger = createLogger('birthday-checker');

/**
 * Check for birthdays today and send messages
 */
export async function checkBirthdays(): Promise<void> {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1;

  logger.info(
    { day: currentDay, month: currentMonth },
    'Checking for birthdays today',
  );

  try {
    // Find all birthdays for today
    const todayBirthdays = await db.select().from(birthdays);

    const birthdaysToday = todayBirthdays.filter(
      (b) => b.day === currentDay && b.month === currentMonth,
    );

    if (birthdaysToday.length === 0) {
      logger.info('No birthdays today');
      return;
    }

    logger.info(
      { count: birthdaysToday.length },
      `Found ${String(birthdaysToday.length)} birthday(s) today`,
    );

    // Group birthdays by guild
    const birthdaysByGuild = birthdaysToday.reduce<
      Record<string, typeof birthdaysToday>
    >((acc, birthday) => {
      acc[birthday.guildId] = acc[birthday.guildId] ?? [];
      acc[birthday.guildId].push(birthday);
      return acc;
    }, {});

    // Send messages for each guild
    for (const [guildId, guildBirthdays] of Object.entries(birthdaysByGuild)) {
      await sendBirthdayMessage(guildId, guildBirthdays);
    }
  } catch (error) {
    logger.error({ error }, 'Error checking birthdays');
  }
}

async function sendBirthdayMessage(
  guildId: string,
  birthdaysToday: {
    userId: string;
    day: number;
    month: number;
    year: number | null;
  }[],
): Promise<void> {
  try {
    const guild = await client.guilds.fetch(guildId);

    // Find a suitable channel to send the message
    // Look for general, announcements, or the first text channel
    const channelNames = [
      'général',
      'general',
      'annonces',
      'announcements',
      'bot',
      'bots',
    ];

    let channel: TextChannel | null = null;

    for (const channelName of channelNames) {
      const foundChannel = guild.channels.cache.find(
        (ch) =>
          ch.isTextBased() &&
          ch.name.toLowerCase().includes(channelName.toLowerCase()),
      ) as TextChannel | undefined;

      if (foundChannel) {
        channel = foundChannel;
        break;
      }
    }

    // If no specific channel found, use the first text channel
    if (!channel) {
      const textChannels = guild.channels.cache.filter((ch) =>
        ch.isTextBased(),
      );
      const firstChannel = textChannels.first();
      if (firstChannel && 'send' in firstChannel) {
        channel = firstChannel as TextChannel;
      }
    }

    if (!channel) {
      logger.warn({ guildId }, 'No suitable text channel found');
      return;
    }

    // Generate birthday messages
    const messages = [
      "🎂 C'est l'anniversaire de {users} aujourd'hui ! Joyeux anniversaire ! 🎉",
      '🎉 Bon anniversaire à {users} ! Que cette journée soit remplie de bonheur ! 🎂',
      "🥳 {users} fête son anniversaire aujourd'hui ! On lui souhaite plein de bonnes choses ! 🎊",
      '🎈 Joyeux anniversaire {users} ! Profite bien de ta journée spéciale ! 🎂',
      "🎁 {users} a une année de plus aujourd'hui ! Bon anniversaire ! 🎉",
      "🌟 C'est un jour spécial pour {users} ! Joyeux anniversaire ! 🎂",
      "🎊 Attention, attention ! C'est l'anniversaire de {users} ! 🎉🎂",
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Get user mentions
    const userMentions = await Promise.all(
      birthdaysToday.map(async (b) => {
        try {
          const user = await client.users.fetch(b.userId);
          return `<@${user.id}>`;
        } catch {
          return null;
        }
      }),
    );

    const validMentions = userMentions.filter((m) => m !== null);

    if (validMentions.length === 0) {
      logger.warn({ guildId }, 'No valid users to mention');
      return;
    }

    let usersText = '';
    if (validMentions.length === 1) {
      usersText = validMentions[0];
    } else if (validMentions.length === 2) {
      usersText = `${validMentions[0]} et ${validMentions[1]}`;
    } else {
      usersText = `${validMentions.slice(0, -1).join(', ')} et ${validMentions[validMentions.length - 1]}`;
    }

    const finalMessage = randomMessage.replace('{users}', usersText);

    await channel.send(finalMessage);
    logger.info(
      { guildId, channelId: channel.id, userCount: validMentions.length },
      'Birthday message sent',
    );
  } catch (error) {
    logger.error({ error, guildId }, 'Failed to send birthday message');
  }
}

/**
 * Start the daily birthday checker
 * Checks at midnight (00:00) every day
 */
export function startBirthdayChecker(): void {
  // Calculate time until next midnight
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();

  logger.info(
    { msUntilMidnight },
    `Birthday checker will run at midnight (in ${String(Math.floor(msUntilMidnight / 1000 / 60))} minutes)`,
  );

  // Schedule the first check at midnight
  setTimeout(() => {
    checkBirthdays().catch((error: unknown) => {
      logger.error({ error }, 'Birthday check failed');
    });

    // Then run every 24 hours
    setInterval(
      () => {
        checkBirthdays().catch((error: unknown) => {
          logger.error({ error }, 'Birthday check failed');
        });
      },
      24 * 60 * 60 * 1000,
    ); // 24 hours
  }, msUntilMidnight);

  // Also run immediately on startup (for testing)
  if (process.env.NODE_ENV === 'development') {
    logger.info('Running birthday check immediately (development mode)');
    setTimeout(() => {
      checkBirthdays().catch((error: unknown) => {
        logger.error({ error }, 'Birthday check failed');
      });
    }, 5000); // Wait 5 seconds for bot to be ready
  }
}
