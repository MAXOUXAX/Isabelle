import { db } from '@/db/index.js';
import { agendaEvents } from '@/db/schema.js';
import { configManager } from '@/manager/config.manager.js';
import { deleteAgendaEventResources } from '@/modules/agenda/services/agenda.service.js';
import {
  AgendaUserError,
  withAgendaErrorHandling,
} from '@/modules/agenda/utils/agenda-errors.js';
import {
  requireConfigValue,
  requireGuild,
} from '@/modules/agenda/utils/interaction-guards.js';
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

export const handleDeleteSubcommand = withAgendaErrorHandling(
  logger,
  async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const { guild, guildId } = requireGuild(interaction);
    const eventId = requireConfigValue(
      interaction.options.getString('event'),
      'Vous devez spécifier un événement à supprimer.',
    );

    const internalId = Number(eventId);
    if (Number.isNaN(internalId)) {
      throw new AgendaUserError("L'identifiant de l'événement est invalide.");
    }

    const record = await db
      .select()
      .from(agendaEvents)
      .where(
        and(eq(agendaEvents.id, internalId), eq(agendaEvents.guildId, guildId)),
      )
      .limit(1);

    const eventRecord = record.at(0);

    if (!eventRecord) {
      throw new AgendaUserError(
        'Impossible de retrouver cet événement. Utilise `/agenda list` pour actualiser la liste.',
      );
    }

    const config = configManager.getGuild(guildId);
    const { eventName, threadDeleted } = await deleteAgendaEventResources({
      guild,
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
  },
  "Une erreur est survenue lors de la suppression de l'événement. Vérifie que j'ai les permissions nécessaires.",
);
