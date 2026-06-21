import { birthdayRepository } from '@/modules/birthdays/birthday.repository.js';
import {
  daysUntilBirthday,
  formatBirthdayCountdown,
  formatLongDayMonth,
} from '@/modules/birthdays/birthday.utils.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';

const logger = createLogger('birthday-upcoming-command');

const UPCOMING_WINDOW_DAYS = 7;

export async function handleUpcomingBirthdaysCommand(
  interaction: ChatInputCommandInteraction,
) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply(
      'Cette commande ne peut être utilisée que sur un serveur.',
    );
    return;
  }

  try {
    const now = new Date();
    const birthdays = await birthdayRepository.listBirthdays(
      interaction.guildId,
    );

    const upcomingBirthdays = birthdays
      .map((birthday) => ({
        ...birthday,
        daysUntil: daysUntilBirthday(birthday.month, birthday.day, now),
      }))
      .filter((birthday) => birthday.daysUntil <= UPCOMING_WINDOW_DAYS)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    if (upcomingBirthdays.length === 0) {
      await interaction.editReply(
        `Aucun anniversaire à venir dans les ${UPCOMING_WINDOW_DAYS.toString()} prochains jours.`,
      );
      return;
    }

    const members = await interaction.guild.members
      .fetch({ user: upcomingBirthdays.map((b) => b.userId) })
      .catch(() => null);

    const birthdayList = upcomingBirthdays
      .map((b) => {
        const displayName =
          members?.get(b.userId)?.displayName ?? `<@${b.userId}>`;
        const date = formatLongDayMonth(b.day, b.month);
        const countdown = formatBirthdayCountdown(b.month, b.day, now);
        return `**${displayName}** — ${date} (${countdown})`;
      })
      .join('\n');

    await interaction.editReply(
      `🎉 Anniversaires à venir dans les ${UPCOMING_WINDOW_DAYS.toString()} prochains jours :\n${birthdayList}`,
    );
  } catch (error) {
    logger.error(
      {
        error,
        guildId: interaction.guildId,
      },
      'Une erreur est survenue lors de la récupération des anniversaires à venir',
    );
    await interaction.editReply(
      'Une erreur est survenue lors de la récupération des anniversaires à venir. Veuillez réessayer plus tard.',
    );
  }
}
