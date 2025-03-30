import {
  CommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
} from 'discord.js';

export abstract class BaseModal {
  protected modal: ModalBuilder;

  constructor(customId: string, title: string) {
    this.modal = new ModalBuilder().setCustomId(customId).setTitle(title);
    this.buildModal();
  }

  abstract customId: string;
  abstract title: string;

  protected abstract buildModal(): void;

  public open(interaction: CommandInteraction): Promise<void> {
    return interaction.showModal(this.modal);
  }

  public abstract handleSubmit(
    interaction: ModalSubmitInteraction,
  ): Promise<void>;
}
