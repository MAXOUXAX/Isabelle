import { configManager } from '@/manager/config.manager.js';
import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export const AGENDA_MODAL_CUSTOM_ID = 'agenda-modal';
export const AI_OPTIONS_CUSTOM_ID = 'ai-options';

interface AgendaModalDefaults {
  title?: string;
  description?: string;
  dates?: string;
  location?: string;
  aiOptions?: ('enhance' | 'emoji')[];
}

export function buildAgendaModal({
  customId = AGENDA_MODAL_CUSTOM_ID,
  defaults = {},
}: {
  customId?: string;
  defaults?: AgendaModalDefaults;
}): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle('Planifier un événement');

  // 1. Event title
  const titleInput = new TextInputBuilder()
    .setCustomId('event-label')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Relire la page 2 du TD n°4')
    .setRequired(true)
    .setMaxLength(100);

  if (defaults.title) {
    titleInput.setValue(defaults.title);
  }

  const titleLabel = new LabelBuilder()
    .setLabel("Nom de l'événement")
    .setTextInputComponent(titleInput);

  // 2. Event description
  const descriptionInput = new TextInputBuilder()
    .setCustomId('event-description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('La page numéro 2 du TD n°4 doit être relue...')
    .setRequired(true)
    .setMaxLength(1000);

  if (defaults.description) {
    descriptionInput.setValue(defaults.description);
  }

  const descriptionLabel = new LabelBuilder()
    .setLabel("Description de l'événement")
    .setTextInputComponent(descriptionInput);

  // 3. Event dates (combined start and end)
  const datesInput = new TextInputBuilder()
    .setCustomId('event-dates')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('26/03/2025 14:00 - 26/03/2025 16:00')
    .setRequired(true);

  if (defaults.dates) {
    datesInput.setValue(defaults.dates);
  }

  const datesLabel = new LabelBuilder()
    .setLabel("Dates de l'événement")
    .setDescription('JJ/MM/AAAA HH:mm ou JJ/MM/AAAA HH:mm - JJ/MM/AAAA HH:mm')
    .setTextInputComponent(datesInput);

  // 4. Event location
  const locationInput = new TextInputBuilder()
    .setCustomId('event-location')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('S1.01, ou https://arche.univ-lorraine.fr/...')
    .setRequired(true);

  if (defaults.location) {
    locationInput.setValue(defaults.location);
  }

  const locationLabel = new LabelBuilder()
    .setLabel("Lieu de l'événement")
    .setTextInputComponent(locationInput);

  const aiDefaults = new Set(defaults.aiOptions ?? []);

  // 5. AI options select menu
  const aiLabel = new LabelBuilder()
    .setLabel("Options d'amélioration IA")
    .setStringSelectMenuComponent(
      new StringSelectMenuBuilder()
        .setCustomId(AI_OPTIONS_CUSTOM_ID)
        .setPlaceholder('Choisir les options IA...')
        .setRequired(false)
        .setMinValues(0)
        .setMaxValues(2)
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Améliorer le texte')
            .setDescription(
              'Reformule le titre et la description pour plus de clarté',
            )
            .setValue('enhance')
            .setEmoji('✨')
            .setDefault(aiDefaults.has('enhance')),
          new StringSelectMenuOptionBuilder()
            .setLabel('Émoji automatique')
            .setDescription("L'IA choisit un emoji adapté au sujet")
            .setValue('emoji')
            .setEmoji('🎯')
            .setDefault(aiDefaults.has('emoji')),
        ),
    );

  return modal.addLabelComponents(
    titleLabel,
    descriptionLabel,
    datesLabel,
    locationLabel,
    aiLabel,
  );
}

/**
 * Handle the /agenda create subcommand.
 * Shows a modal for event creation with optional AI enhancement.
 */
export async function handleCreateSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  // Vérifie si le rôle FISA est configuré
  const guildId = interaction.guildId;
  if (!guildId || !interaction.guild) {
    await interaction.reply({
      content: 'Cette commande doit être utilisée dans un serveur.',
      ephemeral: true,
    });
    return;
  }

  // On récupère la config du serveur
  const { AGENDA_FISA_ROLE_ID } = configManager.getGuild(guildId);
  if (!AGENDA_FISA_ROLE_ID) {
    await interaction.reply({
      content:
        "Le rôle FISA n'est pas configuré. Utilise `/agenda config role:<rôle>` pour le définir.",
      ephemeral: true,
    });
    return;
  }

  const modal = buildAgendaModal({
    customId: AGENDA_MODAL_CUSTOM_ID,
    defaults: {
      aiOptions: ['enhance', 'emoji'],
    },
  });

  await interaction.showModal(modal);
}
