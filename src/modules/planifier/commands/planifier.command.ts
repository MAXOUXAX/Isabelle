import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import {
  ActionRowBuilder,
  CommandInteraction,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export class PlanifierCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('planifier')
    .setDescription(
      'Planifier un événement (créé un événement et un salon de forum dédié)',
    );

  public async executeCommand(interaction: CommandInteraction): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId('planifier-modal')
      .setTitle('Planifier un événement');

    const eventLabel = new TextInputBuilder()
      .setCustomId('event-label')
      .setLabel("Nom de l'événement")
      .setRequired(true)
      .setMaxLength(100)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Relire la page 2 du TD n°4');

    const eventDescription = new TextInputBuilder()
      .setCustomId('event-description')
      .setLabel("Description de l'événement")
      .setRequired(true)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('La page numéro 2 du TD n°4 doit être relue...');

    const eventStartDate = new TextInputBuilder()
      .setCustomId('event-date-start')
      .setLabel("Date de début de l'événement")
      .setRequired(true)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('26/03/2025 14:00');

    const eventEndDate = new TextInputBuilder()
      .setCustomId('event-date-end')
      .setLabel("Date de fin de l'événement")
      .setRequired(true)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('26/03/2025 16:00');

    const eventLocation = new TextInputBuilder()
      .setCustomId('event-location')
      .setLabel("Lieu de l'événement")
      .setRequired(true)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('S1.01, ou https://arche.univ-lorraine.fr/...');

    const titleRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        eventLabel,
      );
    const descriptionRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        eventDescription,
      );
    const dateStartRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        eventStartDate,
      );
    const dateEndRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        eventEndDate,
      );
    const locationRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        eventLocation,
      );

    modal.addComponents(
      titleRow,
      descriptionRow,
      dateStartRow,
      dateEndRow,
      locationRow,
    );

    await interaction.showModal(modal);
  }
}
