import { client } from '@/index.js';
import { logger } from '@/utils/logger.js';
import { Client } from 'discord.js';
import { BaseModal } from './modal.base.js';

export class ModalManager {
  private modals = new Map<string, BaseModal>();

  constructor(private client: Client) {
    this.client.on('interactionCreate', (interaction) => {
      const handler = async () => {
        if (interaction.isModalSubmit()) {
          const modal = this.modals.get(interaction.customId);
          if (modal) {
            await modal.handleSubmit(interaction);
            this.modals.delete(interaction.customId);
          }
        }
      };

      handler().catch((error: unknown) => {
        logger.error(
          `An error occurred while handling a modal interaction: ${error as string}`,
        );
      });
    });
  }

  public registerModal(modal: BaseModal) {
    this.modals.set(modal.customId, modal);
  }
}

export const modalManager = new ModalManager(client);
