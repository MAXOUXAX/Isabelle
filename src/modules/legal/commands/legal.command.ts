import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { legalManager } from '@/modules/legal/legal.manager.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

const logger = createLogger('legal-command');

export class LegalCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder;

  constructor() {
    // Build the command dynamically based on registered consent scopes
    this.commandData = new SlashCommandBuilder()
      .setName('légal')
      .setDescription(
        'Gérer vos consentements légaux pour diverses fonctionnalités.',
      );

    // Add a subcommand group for consent
    this.commandData.addSubcommandGroup((group) => {
      group
        .setName('consentir')
        .setDescription('Donner ou retirer votre consentement');

      // Add a subcommand for each registered consent scope
      for (const scopeConfig of legalManager.getAllConsentScopes()) {
        group.addSubcommand((subcommand) =>
          subcommand
            .setName(scopeConfig.commandName)
            .setDescription(scopeConfig.commandDescription),
        );
      }

      return group;
    });
  }

  async executeCommand(interaction: ChatInputCommandInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (subcommandGroup === 'consentir') {
      await this.handleConsentSubcommand(interaction, subcommand);
    } else {
      await interaction.reply({
        content: 'Groupe de sous-commandes non valide.',
        flags: [MessageFlags.Ephemeral],
      });
    }
  }

  private async handleConsentSubcommand(
    interaction: ChatInputCommandInteraction,
    subcommandName: string,
  ): Promise<void> {
    // Find the consent scope configuration by command name
    const scopeConfig = legalManager
      .getAllConsentScopes()
      .find((config) => config.commandName === subcommandName);

    if (!scopeConfig) {
      logger.error(
        { subcommandName },
        'Consent scope not found for subcommand',
      );
      await interaction.reply({
        content: 'Type de consentement non valide.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    // Build the prompt using the scope's prompt builder
    const promptContainer = scopeConfig.buildPrompt();

    await interaction.reply({
      components: [promptContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  }
}
