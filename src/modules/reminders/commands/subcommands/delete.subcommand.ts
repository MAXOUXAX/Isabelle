import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';
import { deleteReminder, getUserReminderById } from '../remind.shared.js';
import { parseReminderId } from '../remind.utils.js';

const logger = createLogger('reminders:delete');

export const handleDeleteReminderSubcommand = async (
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> => {
  const reminderId = parseReminderId(
    interaction.options.getString('rappel', true),
  );

  if (reminderId === null) {
    await interaction.reply({
      content: 'Identifiant de rappel invalide.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const currentReminder = await getUserReminderById(
      reminderId,
      interaction.user.id,
      guildId,
    );

    if (!currentReminder) {
      await interaction.editReply({
        content:
          "Je n'ai pas trouvé ce rappel dans vos rappels personnels actifs.",
      });
      return;
    }

    await deleteReminder(currentReminder.id);

    await interaction.editReply({
      content: `🗑️ Rappel **#${String(currentReminder.id)}** supprimé.`,
    });
  } catch (error) {
    logger.error({ error, reminderId }, 'Failed to delete reminder');
    await interaction.editReply({
      content: 'Une erreur est survenue lors de la suppression du rappel.',
    });
  }
};
