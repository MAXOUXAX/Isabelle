import { db } from '@/db/index.js';
import { agendaEvents } from '@/db/schema.js';
import { configManager } from '@/manager/config.manager.js';
import { deleteAgendaEventResources } from '@/modules/agenda/services/agenda.service.js';
import {
  AutocompleteOptionHandler,
  filterAutocompleteChoices,
} from '@/utils/autocomplete.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction, Guild, MessageFlags } from 'discord.js';
import { and, eq } from 'drizzle-orm';

const logger = createLogger('agenda-delete');

// Discord has a 3-second timeout for autocomplete responses
// We use a slightly shorter timeout to ensure we respond in time
const AUTOCOMPLETE_TIMEOUT_MS = 2500;

const fetchEventsWithTimeout = async (guild: Guild) => {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, AUTOCOMPLETE_TIMEOUT_MS);
  });

  const eventsPromise = db
    .select()
    .from(agendaEvents)
    .where(eq(agendaEvents.guildId, guild.id))
    .orderBy(agendaEvents.eventStartTime);

  const result = await Promise.race([eventsPromise, timeoutPromise]);

  return result;
};

export const handleDeleteAutocomplete: AutocompleteOptionHandler = async ({
  interaction,
  focusedValue,
}) => {
  if (!interaction.guild) return [];

  const events = await fetchEventsWithTimeout(interaction.guild);

  if (!events) {
    logger.debug('Autocomplete timed out while fetching scheduled events');
    return [];
  }

  const options = events.map((e) => ({
    name: e.title,
    value: e.id.toString(),
  }));

  return filterAutocompleteChoices(options, focusedValue);
};

export async function handleDeleteSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({
      content: 'Cette commande doit être utilisée dans un serveur.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const eventId = interaction.options.getString('event');

  if (!eventId) {
    await interaction.reply({
      content: 'Vous devez spécifier un événement à supprimer.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const internalId = Number(eventId);
    if (Number.isNaN(internalId)) {
      await interaction.reply({
        content: "L'identifiant de l'événement est invalide.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const record = await db
      .select()
      .from(agendaEvents)
      .where(
        and(
          eq(agendaEvents.id, internalId),
          eq(agendaEvents.guildId, interaction.guildId),
        ),
      )
      .limit(1);

    const eventRecord = record.at(0);

    if (!eventRecord) {
      await interaction.reply({
        content:
          'Impossible de retrouver cet événement. Utilise `/agenda list` pour actualiser la liste.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const config = configManager.getGuild(interaction.guildId);
    const { eventName, threadDeleted } = await deleteAgendaEventResources({
      guild: interaction.guild,
      eventId: eventRecord.discordEventId,
      forumChannelId: config.AGENDA_FORUM_CHANNEL_ID,
      eventRecord,
    });

    await interaction.reply({
      content: `L'événement **${eventName}** a été supprimé.${
        threadDeleted
          ? ' Le fil de discussion associé a également été supprimé.'
          : ''
      }`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error({ error, eventId }, 'Failed to delete scheduled event');
    await interaction.reply({
      content:
        "Une erreur est survenue lors de la suppression de l'événement. Vérifiez que j'ai les permissions nécessaires.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
