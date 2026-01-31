import { parseCustomDate } from '@/utils/date.js';
import { createLogger } from '@/utils/logger.js';
import {
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  Interaction,
} from 'discord.js';

const logger = createLogger('planifier-interaction');

export async function handlePlanifierModalSubmit(
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isModalSubmit()) return;

  try {
    const eventLabel = interaction.fields.getTextInputValue('event-label');
    const eventDescription =
      interaction.fields.getTextInputValue('event-description');
    const eventStartDateStr =
      interaction.fields.getTextInputValue('event-date-start');
    const eventEndDateStr =
      interaction.fields.getTextInputValue('event-date-end');
    const eventLocation = interaction.fields.getTextInputValue('event-location');

    const startDate = parseCustomDate(eventStartDateStr);
    const endDate = parseCustomDate(eventEndDateStr);

    if (!startDate) {
      await interaction.reply({
        content: `La date de début "${eventStartDateStr}" est invalide. Utilisez le format DD/MM/YYYY HH:MM (ex: 26/03/2025 14:00).`,
        ephemeral: true,
      });
      return;
    }

    if (!endDate) {
      await interaction.reply({
        content: `La date de fin "${eventEndDateStr}" est invalide. Utilisez le format DD/MM/YYYY HH:MM (ex: 26/03/2025 16:00).`,
        ephemeral: true,
      });
      return;
    }

    if (startDate >= endDate) {
      await interaction.reply({
        content: `La date de fin doit être après la date de début.`,
        ephemeral: true,
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content: 'Cette commande ne peut être utilisée que sur un serveur.',
        ephemeral: true,
      });
      return;
    }

    // Process the event data and create the event
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
    logger.error({ error }, 'Error processing planifier modal submit');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Une erreur est survenue lors de la création de l'événement.",
        ephemeral: true,
      });
    } else {
      await interaction.followUp({
        content: "Une erreur est survenue lors de la création de l'événement.",
        ephemeral: true,
      });
    }
  }
}
