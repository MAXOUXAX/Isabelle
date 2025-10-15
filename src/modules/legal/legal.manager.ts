import { db } from '@/db/index.js';
import { auditLegalConsent } from '@/db/schema.js';
import { createLogger } from '@/utils/logger.js';
import { ContainerBuilder } from 'discord.js';
import { and, desc, eq } from 'drizzle-orm';

const logger = createLogger('legal-manager');

/**
 * Defines the structure of a consent scope configuration
 */
export interface ConsentScopeConfig {
  /** Unique identifier for this consent scope */
  scope: string;
  /** Display name for the scope */
  displayName: string;
  /** Command name to use in Discord slash command */
  commandName: string;
  /** Description for the Discord slash command */
  commandDescription: string;
  /** Function that builds the consent prompt display components */
  buildPrompt: () => ContainerBuilder;
  /** Function that builds the confirmation message after consent/decline */
  buildConfirmation: (accepted: boolean) => ContainerBuilder;
}

/**
 * Manages legal consent for various scopes across Isabelle
 */
export class LegalManager {
  private consentScopes = new Map<string, ConsentScopeConfig>();

  /**
   * Register a new consent scope
   */
  registerConsentScope(config: ConsentScopeConfig): void {
    if (this.consentScopes.has(config.scope)) {
      logger.warn(
        `Consent scope '${config.scope}' is already registered. Overwriting.`,
      );
    }
    this.consentScopes.set(config.scope, config);
    logger.info(`Registered consent scope: ${config.scope}`);
  }

  /**
   * Get a consent scope configuration by scope identifier
   */
  getConsentScope(scope: string): ConsentScopeConfig | undefined {
    return this.consentScopes.get(scope);
  }

  /**
   * Get all registered consent scopes
   */
  getAllConsentScopes(): ConsentScopeConfig[] {
    return Array.from(this.consentScopes.values());
  }

  /**
   * Check if a user has consented to a specific scope
   * Returns true if consented, false if declined, null if no decision yet
   */
  async hasUserConsented(
    userId: string,
    scope: string,
  ): Promise<boolean | null> {
    try {
      const results = await db
        .select()
        .from(auditLegalConsent)
        .where(
          and(
            eq(auditLegalConsent.userId, userId),
            eq(auditLegalConsent.scope, scope),
          ),
        )
        .orderBy(desc(auditLegalConsent.createdAt))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      return results[0].consented === 1;
    } catch (error) {
      logger.error({ error, userId, scope }, 'Failed to check user consent');
      throw error;
    }
  }

  /**
   * Record a user's consent decision for a specific scope
   */
  async recordConsent(
    userId: string,
    scope: string,
    consented: boolean,
  ): Promise<void> {
    try {
      await db.insert(auditLegalConsent).values({
        userId,
        scope,
        consented: consented ? 1 : 0,
      });

      logger.info(
        { userId, scope, consented },
        `User ${consented ? 'accepted' : 'declined'} consent for scope: ${scope}`,
      );
    } catch (error) {
      logger.error(
        { error, userId, scope, consented },
        'Failed to record consent',
      );
      throw error;
    }
  }

  /**
   * Get consent history for a user (all scopes)
   */
  async getUserConsentHistory(userId: string): Promise<
    {
      scope: string;
      consented: boolean;
      timestamp: Date;
    }[]
  > {
    try {
      const results = await db
        .select()
        .from(auditLegalConsent)
        .where(eq(auditLegalConsent.userId, userId))
        .orderBy(desc(auditLegalConsent.createdAt));

      return results.map((result) => ({
        scope: result.scope,
        consented: result.consented === 1,
        timestamp: result.createdAt ?? new Date(),
      }));
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user consent history');
      throw error;
    }
  }

  /**
   * Build custom ID for consent buttons
   */
  buildConsentButtonId(scope: string, action: 'accept' | 'decline'): string {
    return `consent:${scope}:${action}`;
  }

  /**
   * Parse a consent button custom ID
   */
  parseConsentButtonId(customId: string): {
    scope: string;
    action: 'accept' | 'decline';
  } | null {
    const parts = customId.split(':');
    if (
      parts.length === 3 &&
      parts[0] === 'consent' &&
      (parts[2] === 'accept' || parts[2] === 'decline')
    ) {
      return {
        scope: parts[1],
        action: parts[2],
      };
    }
    return null;
  }
}

export const legalManager = new LegalManager();
