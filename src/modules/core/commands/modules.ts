import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import {
  buildModuleDetailMessage,
  buildModulesOverviewMessage,
} from '@/modules/core/messages/modules/modules-message.js';
import { ModuleManager } from '@/modules/module-manager.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

const logger = createLogger('modules-command');

export class Modules implements IsabelleCommand {
  commandData: SlashCommandSubcommandsOnlyBuilder;

  constructor(private readonly moduleManager: ModuleManager) {
    this.commandData = new SlashCommandBuilder()
      .setName('modules')
      .setDescription(
        'Découvre les modules disponibles et leurs fonctionnalités !',
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('overview')
          .setDescription('Voir la liste des modules et leur statut.'),
      );

    for (const descriptor of this.moduleManager.getModuleDescriptors()) {
      this.commandData.addSubcommand((subcommand) =>
        subcommand
          .setName(descriptor.slug)
          .setDescription(`Afficher les détails du module ${descriptor.name}.`),
      );
    }
  }

  public async executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const isOverview = subcommand === 'overview';

    await interaction.deferReply({
      flags: isOverview ? undefined : MessageFlags.Ephemeral,
    });

    try {
      const allModules = this.moduleManager.getModuleData();

      if (isOverview) {
        const container = buildModulesOverviewMessage(allModules);

        await interaction.editReply({
          components: [container],
          flags: [MessageFlags.IsComponentsV2],
        });
        return;
      }

      const moduleDetail = allModules.find((m) => m.slug === subcommand);

      if (!moduleDetail) {
        await interaction.editReply({
          content:
            "Je ne trouve pas d'informations pour ce module. Il est peut-être désactivé ou inconnu.",
        });
        return;
      }

      const container = buildModuleDetailMessage(moduleDetail, allModules);

      await interaction.editReply({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
      });
    } catch (error) {
      logger.error({ error, subcommand }, 'Failed to execute modules command');
      await interaction.editReply({
        content:
          'Une erreur est survenue lors de la récupération des informations de module. Réessaie plus tard.',
      });
    }
  }
}
