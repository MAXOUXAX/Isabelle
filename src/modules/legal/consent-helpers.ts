import { legalManager } from '@/modules/legal/legal.manager.js';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';

/**
 * Helper functions for modules to check and enforce user consent
 */

/**
 * Check if a user has consented to a specific scope and show an error if not
 * @param interaction The interaction to respond to if consent is missing
 * @param userId The user ID to check consent for
 * @param scope The consent scope to check
 * @returns true if consented, false if not (and error message sent)
 */
export async function requireUserConsent(
  interaction: ChatInputCommandInteraction,
  userId: string,
  scope: string,
): Promise<boolean> {
  const hasConsented = await legalManager.hasUserConsented(userId, scope);

  if (hasConsented === null || !hasConsented) {
    const scopeConfig = legalManager.getConsentScope(scope);
    const scopeName = scopeConfig?.displayName ?? scope;

    await interaction.reply({
      content:
        `⚠️ **Consentement requis**\n\n` +
        `Pour utiliser cette fonctionnalité, vous devez d'abord donner votre consentement pour : **${scopeName}**.\n\n` +
        `Utilisez la commande \`/légal consentir ${scopeConfig?.commandName ?? scope}\` pour gérer votre consentement.`,
      flags: [MessageFlags.Ephemeral],
    });
    return false;
  }

  return true;
}

/**
 * Check if a user has consented to a specific scope (target user for commands that affect others)
 * @param interaction The interaction to respond to if consent is missing
 * @param targetUserId The target user ID to check consent for
 * @param scope The consent scope to check
 * @returns true if consented, false if not (and error message sent)
 */
export async function requireTargetUserConsent(
  interaction: ChatInputCommandInteraction,
  targetUserId: string,
  scope: string,
): Promise<boolean> {
  const hasConsented = await legalManager.hasUserConsented(targetUserId, scope);

  if (hasConsented === null || !hasConsented) {
    const scopeConfig = legalManager.getConsentScope(scope);
    const scopeName = scopeConfig?.displayName ?? scope;

    await interaction.reply({
      content:
        `⚠️ **Consentement requis**\n\n` +
        `L'utilisateur ciblé n'a pas donné son consentement pour : **${scopeName}**.\n\n` +
        `Cette personne doit utiliser la commande \`/légal consentir ${scopeConfig?.commandName ?? scope}\` pour autoriser l'utilisation de cette fonctionnalité.`,
      flags: [MessageFlags.Ephemeral],
    });
    return false;
  }

  return true;
}

/**
 * Check if both the command user and target user have consented
 * @param interaction The interaction to respond to if consent is missing
 * @param commandUserId The user running the command
 * @param targetUserId The target user affected by the command
 * @param scope The consent scope to check
 * @returns true if both consented, false if not (and error message sent)
 */
export async function requireBothUsersConsent(
  interaction: ChatInputCommandInteraction,
  commandUserId: string,
  targetUserId: string,
  scope: string,
): Promise<boolean> {
  // Check command user consent first
  const commandUserConsented = await requireUserConsent(
    interaction,
    commandUserId,
    scope,
  );

  if (!commandUserConsented) {
    return false;
  }

  // Then check target user consent
  return await requireTargetUserConsent(interaction, targetUserId, scope);
}

/**
 * Simple consent check without replying to interaction (for use in event handlers, etc.)
 * @param userId The user ID to check
 * @param scope The consent scope
 * @returns true if consented, false otherwise
 */
export async function checkUserConsent(
  userId: string,
  scope: string,
): Promise<boolean> {
  const hasConsented = await legalManager.hasUserConsented(userId, scope);
  return hasConsented === true;
}
