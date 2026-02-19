import { db } from '@/db/index.js';
import { reminders } from '@/db/schema.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction } from 'discord.js';
import {
  DURATION_BOUNDS_ERROR_MESSAGE,
  DURATION_ERROR_MESSAGE,
  isDurationInBounds,
  parseDuration,
} from '../remind.shared.js';

const logger = createLogger('reminders:create');

export const handleCreateReminderSubcommand = async (
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> => {
  const durationInput = interaction.options.getString('duree', true);
  const message = interaction.options.getString('message', true);

  const duration = parseDuration(durationInput);

  if (duration === null) {
    await interaction.reply({
      content: DURATION_ERROR_MESSAGE,
      ephemeral: true,
    });
    return;
  }

  if (!isDurationInBounds(duration)) {
    await interaction.reply({
      content: DURATION_BOUNDS_ERROR_MESSAGE,
      ephemeral: true,
    });
    return;
  }

  const dueAt = new Date(Date.now() + duration);

  await interaction.deferReply({ ephemeral: true });

  try {
    await db.insert(reminders).values({
      userId: interaction.user.id,
      guildId,
      channelId: interaction.channelId,
      message,
      dueAt,
    });

    const timestamp = Math.floor(dueAt.getTime() / 1000);
    await interaction.editReply({
      content: `✅ Rappel programmé pour le <t:${String(timestamp)}:F> (<t:${String(timestamp)}:R>) : "${message}"`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create reminder');
    await interaction.editReply({
      content: 'Une erreur est survenue lors de la création du rappel.',
    });
  }
};
