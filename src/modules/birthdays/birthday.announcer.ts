import { client } from '@/index.js';
import { configManager } from '@/manager/config.manager.js';
import { birthdayRepository } from '@/modules/birthdays/birthday.repository.js';
import {
  isLeapYear,
  isSameLocalDay,
} from '@/modules/birthdays/birthday.utils.js';
import { createLogger } from '@/utils/logger.js';
import { ContainerBuilder, TextDisplayBuilder } from '@discordjs/builders';
import { MessageFlags } from 'discord.js';

const logger = createLogger('birthday-announcer');

/** Accent color of the announcement container (warm birthday gold). */
const ANNOUNCEMENT_ACCENT_COLOR = 0xf2a900;

/** Joins mentions as a natural French list: "@a, @b et @c". */
function joinMentions(userIds: string[]): string {
  const mentions = userIds.map((id) => `<@${id}>`);

  if (mentions.length <= 1) {
    return mentions.join('');
  }

  return `${mentions.slice(0, -1).join(', ')} et ${mentions[mentions.length - 1]}`;
}

function buildAnnouncement(userIds: string[]): string {
  return `Aujourd'hui, on fête l'anniversaire de ${joinMentions(userIds)} ! Alors, joyeux anniversaire ! 🎂`;
}

/**
 * Sends a birthday announcement for the given users to a guild's configured
 * channel. Returns `true` if the message was sent, `false` if it was skipped
 * (no channel configured or channel not sendable). Throws on send failure.
 */
async function sendAnnouncement(
  guildId: string,
  userIds: string[],
): Promise<boolean> {
  const channelId = configManager.getGuild(guildId).BIRTHDAY_CHANNEL_ID;

  if (!channelId) {
    logger.warn(
      { guildId },
      'Birthday announcement requested but no channel configured; skipping',
    );
    return false;
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel?.isSendable()) {
    logger.warn(
      { guildId, channelId },
      'Configured birthday channel is not sendable; skipping',
    );
    return false;
  }

  const container = new ContainerBuilder()
    .setAccentColor(ANNOUNCEMENT_ACCENT_COLOR)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(buildAnnouncement(userIds)),
    );

  await channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { users: userIds, roles: [], parse: [] },
  });

  return true;
}

/**
 * Sends a one-off preview announcement to the guild's configured channel,
 * mentioning the given user. Used to verify the channel and message rendering
 * without waiting for a real birthday. Does not touch the database.
 *
 * Returns `false` when no channel is configured or it isn't sendable.
 */
export function sendBirthdayPreview(
  guildId: string,
  userId: string,
): Promise<boolean> {
  return sendAnnouncement(guildId, [userId]);
}

/**
 * Fetches the birthdays to announce on `now`'s calendar day.
 *
 * On 28 February of a non-leap year it also includes 29 February birthdays, so
 * leap-day people are still celebrated every year — consistent with the
 * countdown, which observes 29/02 on 28/02 in non-leap years.
 */
async function getBirthdaysToAnnounce(now: Date) {
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const includeLeapDay =
    month === 2 && day === 28 && !isLeapYear(now.getFullYear());

  const queries = [birthdayRepository.getBirthdaysForDay(month, day)];
  if (includeLeapDay) {
    queries.push(birthdayRepository.getBirthdaysForDay(2, 29));
  }

  const results = await Promise.all(queries);
  return results.flat();
}

/**
 * Announces today's birthdays in each guild's configured channel.
 *
 * Idempotent: a birthday is only announced once per day thanks to the
 * `lastNotified` marker, so it is safe to run on startup and on a schedule.
 * Only birthdays falling on `now`'s calendar day are considered, so missed
 * birthdays from previous days (e.g. while the bot was offline) are never
 * back-announced.
 */
export async function announceBirthdays(now: Date = new Date()): Promise<void> {
  const todaysBirthdays = await getBirthdaysToAnnounce(now);

  const pending = todaysBirthdays.filter(
    (birthday) => !isSameLocalDay(birthday.lastNotified, now),
  );

  if (pending.length === 0) {
    return;
  }

  const byGuild = new Map<string, typeof pending>();
  for (const birthday of pending) {
    const existing = byGuild.get(birthday.guildId) ?? [];
    existing.push(birthday);
    byGuild.set(birthday.guildId, existing);
  }

  const notifiedIds: number[] = [];

  for (const [guildId, entries] of byGuild) {
    const userIds = entries.map((entry) => entry.userId);

    try {
      const sent = await sendAnnouncement(guildId, userIds);

      if (sent) {
        notifiedIds.push(...entries.map((entry) => entry.id));
      }
    } catch (error) {
      logger.error({ error, guildId }, 'Failed to send birthday announcement');
    }
  }

  try {
    await birthdayRepository.markBirthdaysNotified(notifiedIds, now);
  } catch (error) {
    logger.error(
      { error, count: notifiedIds.length },
      'Failed to mark birthdays as notified',
    );
  }
}
