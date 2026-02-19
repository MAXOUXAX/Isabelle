import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';
import { formatReminderPreview, getUserReminders } from '../remind.shared.js';

const logger = createLogger('reminders:list');

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

    const lines = userReminders.map((reminder) => {
      const timestamp = Math.floor(reminder.dueAt.getTime() / 1000);
      return `• **#${String(reminder.id)}** — <t:${String(timestamp)}:F> (<t:${String(timestamp)}:R>)\n> ${formatReminderPreview(reminder.message, 120)}`;
    });

    await interaction.editReply({
      content: `🗂️ Vos rappels actifs :\n\n${lines.join('\n\n')}`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list reminders');
    await interaction.editReply({
      content: "Impossible de récupérer vos rappels pour l'instant.",
    });
  }
};
