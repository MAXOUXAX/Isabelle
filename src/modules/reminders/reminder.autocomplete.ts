import {
  AutocompleteOptionHandler,
  filterAutocompleteChoices,
} from '@/utils/autocomplete.js';
import { createLogger } from '@/utils/logger.js';
import {
  formatReminderPreview,
  formatReminderRelativeTime,
} from './reminder.format.js';
import { getUserReminders } from './reminder.repository.js';

const logger = createLogger('reminders:autocomplete');

export const handleReminderAutocomplete: AutocompleteOptionHandler = async ({
  interaction,
  focusedValue,
  subcommand,
}) => {
  if (subcommand !== 'edit' && subcommand !== 'delete') {
    return [];
  }

  const guildId = interaction.guildId;
  if (!guildId) {
    return [];
  }

  try {
    const userReminders = await getUserReminders(interaction.user.id, guildId);

    const choices = userReminders.map((reminder) => ({
      name: `#${String(reminder.id)} • ${formatReminderPreview(reminder.message)} • ${formatReminderRelativeTime(reminder.dueAt)}`,
      value: String(reminder.id),
    }));

    return filterAutocompleteChoices(choices, focusedValue);
  } catch (error) {
    logger.error(
      { error, userId: interaction.user.id, guildId, subcommand },
      'Failed to build reminder autocomplete choices',
    );
    return [];
  }
};
