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
      customId: 'event-label',
      label: "Nom de l'événement",
      required: true,
      maxLength: 100,
      style: TextInputStyle.Short,
      placeholder: 'Relire la page 2 du TD n°4',
    });

    const eventDescription = new TextInputBuilder({
      customId: 'event-description',
      label: "Description de l'événement",
      required: true,
      maxLength: 1000,
      style: TextInputStyle.Paragraph,
      placeholder: 'La page numéro 2 du TD n°4 doit être relue...',
    });

    const eventStartDate = new TextInputBuilder({
      customId: 'event-date-start',
      label: "Date de début de l'événement",
      required: true,
      style: TextInputStyle.Short,
      placeholder: '26/03/2025 14:00',
    });

    const eventEndDate = new TextInputBuilder({
      customId: 'event-date-end',
      label: "Date de fin de l'événement",
      required: true,
      style: TextInputStyle.Short,
      placeholder: '26/03/2025 16:00',
    });

    const eventLocation = new TextInputBuilder({
      customId: 'event-location',
      label: "Lieu de l'événement",
      required: true,
      style: TextInputStyle.Short,
      placeholder: 'S1.01, ou https://arche.univ-lorraine.fr/...',
    });

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
