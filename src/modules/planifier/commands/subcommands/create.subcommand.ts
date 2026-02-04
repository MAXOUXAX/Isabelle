import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

const AI_SELECT_CUSTOM_ID = 'ai-options';

/**
 * Handle the /planifier create subcommand.
 * Shows a modal for event creation with optional AI enhancement.
 */
export async function handleCreateSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId('planifier-modal')
    .setTitle('Planifier un événement');

  // 1. Event title
  const titleLabel = new LabelBuilder()
    .setLabel("Nom de l'événement")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId('event-label')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Relire la page 2 du TD n°4')
        .setRequired(true)
        .setMaxLength(100),
    );

  // 2. Event description
  const descriptionLabel = new LabelBuilder()
    .setLabel("Description de l'événement")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId('event-description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('La page numéro 2 du TD n°4 doit être relue...')
        .setRequired(true)
        .setMaxLength(1000),
    );

  // 3. Event dates (combined start and end)
  const datesLabel = new LabelBuilder()
    .setLabel("Dates de l'événement")
    .setDescription('JJ/MM/AAAA HH:mm ou JJ/MM/AAAA HH:mm - JJ/MM/AAAA HH:mm')
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId('event-dates')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('26/03/2025 14:00 - 26/03/2025 16:00')
        .setRequired(true),
    );

  // 4. Event location
  const locationLabel = new LabelBuilder()
    .setLabel("Lieu de l'événement")
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId('event-location')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('S1.01, ou https://arche.univ-lorraine.fr/...')
        .setRequired(true),
    );

  // 5. AI options select menu
  const aiLabel = new LabelBuilder()
    .setLabel("Options d'amélioration IA")
    .setStringSelectMenuComponent(
      new StringSelectMenuBuilder()
        .setCustomId(AI_SELECT_CUSTOM_ID)
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
            .setDefault(true),
          new StringSelectMenuOptionBuilder()
            .setLabel('Émoji automatique')
            .setDescription("L'IA choisit un emoji adapté au sujet")
            .setValue('emoji')
            .setEmoji('🎯')
            .setDefault(true),
        ),
    );

  modal.addLabelComponents(
    titleLabel,
    descriptionLabel,
    datesLabel,
    locationLabel,
    aiLabel,
  );

  await interaction.showModal(modal);
}
