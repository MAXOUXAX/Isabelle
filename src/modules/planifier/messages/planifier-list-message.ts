import { agendaEvents } from '@/db/schema.js';
import { colors, emojis } from '@/utils/theme.js';
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

export const PLANIFIER_EVENT_SELECT_ID = 'planifier:event-select';
export const PLANIFIER_EVENT_ACTION_ID = 'planifier:event';

type AgendaEvent = typeof agendaEvents.$inferSelect;

export function buildEventsOverviewMessage(
  events: AgendaEvent[],
): ContainerBuilder {
  const header = `## ${emojis.calendar} Événements planifiés\n${String(events.length)} événement(s) à venir`;

  const container = new ContainerBuilder()
    .setAccentColor(colors.primary)
    .addTextDisplayComponents((text) => text.setContent(header));

  if (events.length === 0) {
    container
      .addSeparatorComponents((sep) =>
        sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          'Aucun événement planifié. Utilise `/planifier create` pour en créer un !',
        ),
      );
    return container;
  }

  // Add event select menu
  const selectMenu = buildEventSelectMenu(events);
  container.addActionRowComponents((row) => row.addComponents(selectMenu));

  // Add event list
  const eventList = buildEventListSection(events);
  container
    .addSeparatorComponents((sep) =>
      sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents((text) => text.setContent(eventList));

  return container;
}

function buildEventSelectMenu(events: AgendaEvent[]): StringSelectMenuBuilder {
  return new StringSelectMenuBuilder()
    .setCustomId(PLANIFIER_EVENT_SELECT_ID)
    .setPlaceholder('Sélectionne un événement pour voir ses détails...')
    .addOptions(
      events.slice(0, 25).map((event) => {
        const startDate = event.eventStartTime;
        const dateLabel = startDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        });

        return new StringSelectMenuOptionBuilder()
          .setLabel(event.title.slice(0, 100))
          .setDescription(dateLabel)
          .setValue(event.discordEventId)
          .setEmoji(event.emoji);
      }),
    );
}

function buildEventListSection(events: AgendaEvent[]): string {
  const lines = events.slice(0, 10).map((event) => {
    const startDate = event.eventStartTime;
    const formattedDate = startDate.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${event.emoji} **${event.title}** — ${formattedDate}`;
  });

  if (events.length > 10) {
    lines.push(`-# ...et ${String(events.length - 10)} autres événement(s)`);
  }

  return lines.join('\n');
}

export function buildEventDetailMessage(
  event: AgendaEvent,
  allEvents: AgendaEvent[],
): ContainerBuilder {
  const startDate = event.eventStartTime;
  const endDate = event.eventEndTime;

  const formattedStartDate = startDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedEndDate = endDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let header = `## ${event.emoji} ${event.title}\n\n`;
  if (event.description) {
    header += `${event.description}\n\n`;
  }

  const container = new ContainerBuilder()
    .setAccentColor(colors.accent)
    .addTextDisplayComponents((text) => text.setContent(header));

  // Navigation dropdown
  if (allEvents.length > 0) {
    const selectMenu = buildEventSelectMenu(allEvents);
    container.addActionRowComponents((row) => row.addComponents(selectMenu));
  }

  const editButton = new ButtonBuilder()
    .setCustomId(`${PLANIFIER_EVENT_ACTION_ID}:edit:${event.discordEventId}`)
    .setLabel('Modifier')
    .setEmoji('✏️')
    .setStyle(ButtonStyle.Primary);

  const deleteButton = new ButtonBuilder()
    .setCustomId(`${PLANIFIER_EVENT_ACTION_ID}:delete:${event.discordEventId}`)
    .setLabel('Supprimer')
    .setEmoji('🗑️')
    .setStyle(ButtonStyle.Danger);

  container.addActionRowComponents((row) =>
    row.addComponents(editButton, deleteButton),
  );

  // Event details
  const location = event.location;
  let details = `### Détails\n\n`;
  details += `**📍 Lieu :** ${location}\n`;
  details += `**🕐 Début :** ${formattedStartDate}\n`;
  details += `**🕐 Fin :** ${formattedEndDate}\n`;

  if (event.discordEventId) {
    details += `\n[Voir l'événement Discord](https://discord.com/events/${event.guildId}/${event.discordEventId})`;
  }

  container
    .addSeparatorComponents((sep) =>
      sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents((text) => text.setContent(details));

  return container;
}
