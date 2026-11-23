import { isBirthdayAdmin } from '@/modules/birthdays/birthday.permissions.js';
import { birthdayRepository } from '@/modules/birthdays/birthday.repository.js';
import {
  formatDayMonth,
  formatLongDayMonth,
  isValidMonthDay,
} from '@/modules/birthdays/birthday.utils.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';

const logger = createLogger('birthday-set-command');

export async function handleSetBirthdayCommand(
  interaction: ChatInputCommandInteraction,
) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId) {
    await interaction.editReply(
      'Cette commande ne peut être utilisée que sur un serveur.',
    );
    return;
  }

  const user = interaction.options.getUser('utilisateur') ?? interaction.user;

  if (user.id !== interaction.user.id && !isBirthdayAdmin(interaction)) {
    await interaction.editReply(
      'Tu ne peux définir que ton propre anniversaire. Seuls les administrateurs du serveur peuvent définir celui des autres.',
    );
    return;
  }

  const date = interaction.options.getString('date', true);
  const dateRegex = /^(\d{2})\/(\d{2})$/;

  const match = dateRegex.exec(date);
  if (!match) {
    await interaction.editReply(
      'Le format de la date est invalide. Veuillez utiliser le format JJ/MM.',
    );
    return;
  }

  const [, dayStr, monthStr] = match;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);

  if (!isValidMonthDay(month, day)) {
    await interaction.editReply(
      'La date est invalide. Vérifiez que le jour et le mois existent (format JJ/MM).',
    );
    return;
  }

  try {
    await birthdayRepository.setBirthday(
      interaction.guildId,
      user.id,
      month,
      day,
    );

    await interaction.editReply(
      `L'anniversaire de ${user.toString()} a été défini au **${formatLongDayMonth(day, month)}** (${formatDayMonth(day, month)}).`,
    );
  } catch (error) {
    logger.error(
      {
        error,
        guildId: interaction.guildId,
        userId: user.id,
        month,
        day,
      },
      "Une erreur est survenue lors de la définition de l'anniversaire",
    );
    await interaction.editReply(
      "Une erreur est survenue lors de la définition de l'anniversaire. Veuillez réessayer plus tard.",
    );
  }
}
