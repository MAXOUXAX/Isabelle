import {
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  Interaction,
} from 'discord.js';

export async function handlePlanifierModalSubmit(
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isModalSubmit()) return;

  const eventLabel = interaction.fields.getTextInputValue('event-label');
  const eventDescription =
    interaction.fields.getTextInputValue('event-description');
  const eventStartDate =
    interaction.fields.getTextInputValue('event-date-start');
  const eventEndDate = interaction.fields.getTextInputValue('event-date-end');
  const eventLocation = interaction.fields.getTextInputValue('event-location');

  // Process the event data and create the event
  await Promise.all([
    interaction.guild?.scheduledEvents.create({
      name: eventLabel,
      description: eventDescription,
      entityType: GuildScheduledEventEntityType.External,
      scheduledStartTime: new Date(eventStartDate),
      scheduledEndTime: new Date(eventEndDate),
      entityMetadata: {
        location: eventLocation,
      },
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
    }),

    interaction.reply(`L'événement "${eventLabel}" a été créé !`),
  ]);
}
