import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';
import { getUserReminders } from '../remind.shared.js';
import { formatReminderPreview } from '../remind.utils.js';

const logger = createLogger('reminders:list');
const MAX_LISTED_REMINDERS = 10;

export const handleListReminderSubcommand = async (
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> => {
  await interaction.deferReply({ ephemeral: true });

  try {
    const userReminders = await getUserReminders(interaction.user.id, guildId);

    if (userReminders.length === 0) {
      await interaction.editReply({
        content: "Vous n'avez aucun rappel actif.",
      });
      return;
    }

    const displayedReminders = userReminders.slice(0, MAX_LISTED_REMINDERS);
    const hiddenReminderCount =
      userReminders.length - displayedReminders.length;

    const lines = displayedReminders.map((reminder) => {
      const timestamp = Math.floor(reminder.dueAt.getTime() / 1000);
      return `• **#${String(reminder.id)}** — <t:${String(timestamp)}:F> (<t:${String(timestamp)}:R>)\n> ${formatReminderPreview(reminder.message, 40)}`;
    });

    if (hiddenReminderCount > 0) {
      lines.push(
        `…et ${String(hiddenReminderCount)} autre(s) rappel(s) non affiché(s).`,
      );
    }

    await interaction.editReply({
      content: `🗂️ Vos rappels actifs :\n\n${lines.join('\n\n')}`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    logger.error(
      {
        error,
        functionName: 'handleListReminderSubcommand',
        guildId,
        maxListedReminders: MAX_LISTED_REMINDERS,
        userId: interaction.user.id,
      },
      'Failed to list reminders',
    );
    await interaction.editReply({
      content: "Impossible de récupérer vos rappels pour l'instant.",
    });
  }
};
