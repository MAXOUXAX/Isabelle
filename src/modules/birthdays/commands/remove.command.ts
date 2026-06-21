import { isBirthdayAdmin } from '@/modules/birthdays/birthday.permissions.js';
import { birthdayRepository } from '@/modules/birthdays/birthday.repository.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';

const logger = createLogger('birthday-remove-command');

export async function handleRemoveBirthdayCommand(
  interaction: ChatInputCommandInteraction,
) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId) {
    await interaction.editReply(
      'Cette commande ne peut être utilisée que sur un serveur.',
    );
    return;
  }

  if (!isBirthdayAdmin(interaction)) {
    await interaction.editReply(
      'Seuls les administrateurs du serveur peuvent supprimer un anniversaire. Tu peux modifier le tien avec `/anniversaires set`.',
    );
    return;
  }

  const user = interaction.options.getUser('utilisateur', true);

  try {
    await birthdayRepository.removeBirthday(interaction.guildId, user.id);

    await interaction.editReply(
      `L'anniversaire de ${user.toString()} a été supprimé.`,
    );
  } catch (error) {
    logger.error(
      {
        error,
        guildId: interaction.guildId,
        userId: user.id,
      },
      "Une erreur est survenue lors de la suppression de l'anniversaire",
    );
    await interaction.editReply(
      "Une erreur est survenue lors de la suppression de l'anniversaire. Veuillez réessayer plus tard.",
    );
  }
}
