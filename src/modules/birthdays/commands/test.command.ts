import { sendBirthdayPreview } from '@/modules/birthdays/birthday.announcer.js';
import { isBirthdayAdmin } from '@/modules/birthdays/birthday.permissions.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';

const logger = createLogger('birthday-test-command');

export async function handleTestBirthdayCommand(
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
      "Seuls les administrateurs du serveur peuvent tester l'annonce des anniversaires.",
    );
    return;
  }

  try {
    const sent = await sendBirthdayPreview(
      interaction.guildId,
      interaction.user.id,
    );

    if (!sent) {
      await interaction.editReply(
        "Aucun salon d'annonce n'est configuré (ou il n'est pas accessible). Utilise `/anniversaires config` pour en définir un.",
      );
      return;
    }

    await interaction.editReply(
      "Annonce de test envoyée dans le salon configuré. C'était juste un test, aucune base de données n'a été modifiée.",
    );
  } catch (error) {
    logger.error(
      { error, guildId: interaction.guildId },
      "Une erreur est survenue lors de l'envoi de l'annonce de test",
    );
    await interaction.editReply(
      "Une erreur est survenue lors de l'envoi de l'annonce de test. Veuillez réessayer plus tard.",
    );
  }
}
