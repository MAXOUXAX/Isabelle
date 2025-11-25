import { InteractionHandler } from '@/modules/bot-module.js';
import {
  buildModuleDetailMessage,
  MODULES_SELECT_ID,
} from '@/modules/core/messages/modules/modules-message.js';
import { moduleManager } from '@/modules/module-manager.js';
import { createLogger } from '@/utils/logger.js';
import { Interaction, MessageFlags } from 'discord.js';

const logger = createLogger('modules-navigation');

/**
 * Handles the module selection dropdown in both overview and detail views
 */
export class ModulesSelectHandler implements InteractionHandler {
  customId = MODULES_SELECT_ID;

  async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isStringSelectMenu()) {
      return;
    }

    const selectedSlug = interaction.values[0];

    if (!selectedSlug) {
      logger.warn('No module selected in modules dropdown');
      await interaction.reply({
        content:
          'Aucun module sélectionné. Utilise `/modules overview` pour voir les modules disponibles.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const allModules = moduleManager.getModuleData();
    const moduleData = allModules.find((m) => m.slug === selectedSlug);

    if (!moduleData) {
      await interaction.reply({
        content:
          "Ce module n'existe plus ou a été désactivé. Utilise `/modules overview` pour voir les modules disponibles.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const container = buildModuleDetailMessage(moduleData, allModules);

    await interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}
