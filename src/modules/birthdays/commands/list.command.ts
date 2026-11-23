import { birthdayRepository } from '@/modules/birthdays/birthday.repository.js';
import {
  formatBirthdayCountdown,
  formatLongDayMonth,
  nextBirthdayDate,
} from '@/modules/birthdays/birthday.utils.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';

const logger = createLogger('birthday-list-command');

export async function handleListBirthdaysCommand(
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
    const birthdays = await birthdayRepository.listBirthdays(
      interaction.guildId,
    );

    if (birthdays.length === 0) {
      await interaction.editReply(
        "Aucun anniversaire n'a été défini sur ce serveur.",
      );
      return;
    }

    const members = await interaction.guild.members
      .fetch({ user: birthdays.map((b) => b.userId) })
      .catch(() => null);

    const now = new Date();

    const birthdayList = birthdays
      .map((b) => ({
        ...b,
        next: nextBirthdayDate(b.month, b.day, now),
      }))
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .map((b) => {
        const displayName =
          members?.get(b.userId)?.displayName ?? `<@${b.userId}>`;
        const date = formatLongDayMonth(b.day, b.month);
        const countdown = formatBirthdayCountdown(b.month, b.day, now);
        return `**${displayName}** — ${date} (${countdown})`;
      })
      .join('\n');

    await interaction.editReply(
      `🎂 Liste des anniversaires :\n${birthdayList}`,
    );
  } catch (error) {
    logger.error(
      {
        error,
        guildId: interaction.guildId,
      },
      'Une erreur est survenue lors de la récupération des anniversaires',
    );
    await interaction.editReply(
      'Une erreur est survenue lors de la récupération des anniversaires. Veuillez réessayer plus tard.',
    );
  }
}
