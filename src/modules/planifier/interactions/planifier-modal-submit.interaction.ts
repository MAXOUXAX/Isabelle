import { createLogger } from '@/utils/logger.js';
import {
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  Interaction,
} from 'discord.js';

const logger = createLogger('planifier');

function parseDate(input: string): Date | null {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;
  const match = regex.exec(input);
  if (!match) return null;

  const dayStr = match[1];
  const monthStr = match[2];
  const yearStr = match[3];
  const hourStr = match[4];
  const minuteStr = match[5];

  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  // Month is 0-indexed in JS Date
  const date = new Date(year, month - 1, day, hour, minute);

  // Validation
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

export async function handlePlanifierModalSubmit(
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isModalSubmit()) return;

  if (!interaction.guild) {
    await interaction.reply({
      content: 'Cette commande ne peut être utilisée que dans un serveur.',
      ephemeral: true,
    });
    return;
  }

  const eventLabel = interaction.fields.getTextInputValue('event-label');
  const eventDescription =
    interaction.fields.getTextInputValue('event-description');
  const eventStartDate =
    interaction.fields.getTextInputValue('event-date-start');
  const eventEndDate = interaction.fields.getTextInputValue('event-date-end');
  const eventLocation = interaction.fields.getTextInputValue('event-location');

  const startDate = parseDate(eventStartDate);
  const endDate = parseDate(eventEndDate);

  if (!startDate || !endDate) {
    await interaction.reply({
      content:
        'Format de date invalide (JJ/MM/AAAA HH:MM). Exemple: 26/03/2025 14:00',
      ephemeral: true,
    });
    return;
  }

  if (startDate >= endDate) {
    await interaction.reply({
      content: 'La date de fin doit être après la date de début.',
      ephemeral: true,
    });
    return;
  }

  if (startDate < new Date()) {
    await interaction.reply({
      content: 'La date de début ne peut pas être dans le passé.',
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.guild.scheduledEvents.create({
      name: eventLabel,
      description: eventDescription,
      entityType: GuildScheduledEventEntityType.External,
      scheduledStartTime: startDate,
      scheduledEndTime: endDate,
      entityMetadata: {
        location: eventLocation,
      },
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
    });

    await interaction.reply(`L'événement "${eventLabel}" a été créé !`);
  } catch (error) {
    logger.error({ error }, 'Failed to create scheduled event');
    await interaction.reply({
      content:
        "Une erreur est survenue lors de la création de l'événement. Vérifiez que j'ai les permissions nécessaires (Gérer les événements).",
      ephemeral: true,
    });
  }
}
