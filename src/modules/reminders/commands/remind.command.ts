import { IsabelleAutocompleteCommandBase } from '@/manager/commands/command.interface.js';
import type { AutocompleteOptionHandler } from '@/utils/autocomplete.js';
import {
  ChatInputCommandInteraction,
  InteractionContextType,
  SlashCommandBuilder,
} from 'discord.js';
import { handleReminderAutocomplete } from './remind.shared.js';
import { handleCreateReminderSubcommand } from './subcommands/create.subcommand.js';
import { handleDeleteReminderSubcommand } from './subcommands/delete.subcommand.js';
import { handleEditReminderSubcommand } from './subcommands/edit.subcommand.js';
import { handleListReminderSubcommand } from './subcommands/list.subcommand.js';

type ReminderSubcommand = 'create' | 'list' | 'edit' | 'delete';

export class RemindCommand extends IsabelleAutocompleteCommandBase {
  commandData = new SlashCommandBuilder()
    .setName('rappel')
    .setDescription('Gérer vos rappels personnels')
    .setContexts([InteractionContextType.Guild])
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Programmer un nouveau rappel')
        .addStringOption((option) =>
          option
            .setName('duree')
            .setDescription(
              'Durée ou date (ex: 1h30, 1minute30s, 30 janvier 2026 10:49)',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('message')
            .setDescription('Le message de rappel')
            .setRequired(true)
            .setMaxLength(1800),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('Afficher vos rappels actifs'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('edit')
        .setDescription('Modifier un rappel existant')
        .addStringOption((option) =>
          option
            .setName('rappel')
            .setDescription('Le rappel à modifier')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName('duree')
            .setDescription(
              'Nouvelle durée/date (ex: 1h30, 30 janvier 2026 10:49)',
            )
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName('message')
            .setDescription('Nouveau message (optionnel)')
            .setRequired(false)
            .setMaxLength(1800),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Supprimer un rappel')
        .addStringOption((option) =>
          option
            .setName('rappel')
            .setDescription('Le rappel à supprimer')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    );

  protected getAutocompleteHandlers(): Record<
    string,
    AutocompleteOptionHandler
  > {
    return {
      rappel: handleReminderAutocomplete,
    };
  }

  async executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        content: "Cette commande n'est disponible que sur les serveurs.",
        ephemeral: true,
      });
      return;
    }

    const subcommand =
      interaction.options.getSubcommand() as ReminderSubcommand;

    switch (subcommand) {
      case 'create':
        await handleCreateReminderSubcommand(interaction, guildId);
        break;
      case 'list':
        await handleListReminderSubcommand(interaction, guildId);
        break;
      case 'edit':
        await handleEditReminderSubcommand(interaction, guildId);
        break;
      case 'delete':
        await handleDeleteReminderSubcommand(interaction, guildId);
        break;
      default:
        await interaction.reply({
          content:
            'Sous-commande inconnue. Utilisez `/rappel create`, `/rappel list`, `/rappel edit` ou `/rappel delete`.',
          ephemeral: true,
        });
    }
  }
}
