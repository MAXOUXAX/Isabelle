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

    const eventLabel = new TextInputBuilder({
      custom_id: 'event-label',
      label: "Nom de l'événement",
      style: TextInputStyle.Short,
    })
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder('Relire la page 2 du TD n°4');

    const eventDescription = new TextInputBuilder({
      custom_id: 'event-description',
      label: "Description de l'événement",
      style: TextInputStyle.Paragraph,
    })
      .setRequired(true)
      .setMaxLength(1000)
      .setPlaceholder('La page numéro 2 du TD n°4 doit être relue...');

    const eventStartDate = new TextInputBuilder({
      custom_id: 'event-date-start',
      label: "Date de début de l'événement",
      style: TextInputStyle.Short,
    })
      .setRequired(true)
      .setPlaceholder('26/03/2025 14:00');

    const eventEndDate = new TextInputBuilder({
      custom_id: 'event-date-end',
      label: "Date de fin de l'événement",
      style: TextInputStyle.Short,
    })
      .setRequired(true)
      .setPlaceholder('26/03/2025 16:00');

    const eventLocation = new TextInputBuilder({
      custom_id: 'event-location',
      label: "Lieu de l'événement",
      style: TextInputStyle.Short,
    })
      .setRequired(true)
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

    // eslint-disable-next-line @typescript-eslint/no-deprecated
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
