import { InteractionHandler } from '@/modules/bot-module.js';
import { legalManager } from '@/modules/legal/legal.manager.js';
import { createLogger } from '@/utils/logger.js';
import { Interaction, MessageFlags } from 'discord.js';

const logger = createLogger('consent-interaction');

/**
 * Universal consent interaction handler that works for all consent scopes
 */
export class ConsentInteractionHandler implements InteractionHandler {
  customId = 'consent'; // This is a prefix, actual IDs are `consent:scope:action`

  async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;

    // Parse the custom ID to extract scope and action
    const parsed = legalManager.parseConsentButtonId(interaction.customId);

    if (!parsed) {
      logger.warn(
        { customId: interaction.customId },
        'Failed to parse consent button ID',
      );
      await interaction.reply({
        content:
          "Une erreur s'est produite lors du traitement de votre choix. L'identifiant du bouton est invalide.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const { scope, action } = parsed;
    const consented = action === 'accept';

    // Get the consent scope configuration
    const scopeConfig = legalManager.getConsentScope(scope);

    if (!scopeConfig) {
      logger.error({ scope }, 'Consent scope configuration not found');
      await interaction.reply({
        content:
          "Une erreur s'est produite : le type de consentement demandé n'existe pas.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    // Record the consent
    try {
      await legalManager.recordConsent(interaction.user.id, scope, consented);

      // Build and send confirmation using the scope's confirmation builder
      const confirmationContainer = scopeConfig.buildConfirmation(consented);

      await interaction.update({
        components: [confirmationContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      logger.info(
        { userId: interaction.user.id, scope, consented },
        `User ${consented ? 'accepted' : 'declined'} consent`,
      );
    } catch (error) {
      logger.error(
        { error, userId: interaction.user.id, scope, consented },
        'Failed to record consent',
      );
      await interaction.reply({
        content:
          "Une erreur s'est produite lors de l'enregistrement de votre choix. Veuillez réessayer.",
        flags: [MessageFlags.Ephemeral],
      });
    }
  }
}
