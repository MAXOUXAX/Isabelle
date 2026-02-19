import { db } from '@/db/index.js';
import { reminders } from '@/db/schema.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';
import { eq } from 'drizzle-orm';
import {
  DURATION_BOUNDS_ERROR_MESSAGE,
  DURATION_ERROR_MESSAGE,
  formatReminderPreview,
  getUserReminderById,
  isDurationInBounds,
  parseDuration,
  parseReminderId,
} from '../remind.shared.js';

const logger = createLogger('reminders:edit');

export const handleEditReminderSubcommand = async (
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> => {
  const reminderId = parseReminderId(
    interaction.options.getString('rappel', true),
  );
  const durationInput = interaction.options.getString('duree', false);
  const newMessage = interaction.options.getString('message', false);

  if (reminderId === null) {
    await interaction.reply({
      content: 'Identifiant de rappel invalide.',
      ephemeral: true,
    });
    return;
  }

  if (!durationInput && !newMessage) {
    await interaction.reply({
      content:
        'Rien à modifier : fournissez au moins une nouvelle durée ou un nouveau message.',
      ephemeral: true,
    });
    return;
  }

  const duration = durationInput ? parseDuration(durationInput) : null;

  if (durationInput && duration === null) {
    await interaction.reply({
      content: DURATION_ERROR_MESSAGE,
      ephemeral: true,
    });
    return;
  }

  if (duration !== null && !isDurationInBounds(duration)) {
    await interaction.reply({
      content: DURATION_BOUNDS_ERROR_MESSAGE,
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

    const updatedDueAt =
      duration !== null ? new Date(Date.now() + duration) : undefined;

    await db
      .update(reminders)
      .set({
        dueAt: updatedDueAt,
        message: newMessage ?? undefined,
      })
      .where(eq(reminders.id, currentReminder.id));

    const finalDueAt = updatedDueAt ?? currentReminder.dueAt;
    const finalMessage = newMessage ?? currentReminder.message;
    const timestamp = Math.floor(finalDueAt.getTime() / 1000);

    await interaction.editReply({
      content: `✏️ Rappel **#${String(currentReminder.id)}** mis à jour.\n<t:${String(timestamp)}:F> (<t:${String(timestamp)}:R>)\n> ${formatReminderPreview(finalMessage, 200)}`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    logger.error({ error, reminderId }, 'Failed to edit reminder');
    await interaction.editReply({
      content: 'Une erreur est survenue lors de la modification du rappel.',
    });
  }
};
