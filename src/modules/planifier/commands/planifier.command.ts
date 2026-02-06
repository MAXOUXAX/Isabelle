import { IsabelleAutocompleteCommandBase } from '@/manager/commands/command.interface.js';
import type { AutocompleteOptionHandler } from '@/utils/autocomplete.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { handleConfigSubcommand } from './subcommands/config.subcommand.js';
import { handleCreateSubcommand } from './subcommands/create.subcommand.js';
import {
  handleDeleteAutocomplete,
  handleDeleteSubcommand,
} from './subcommands/delete.subcommand.js';
import { handleListSubcommand } from './subcommands/list.subcommand.js';

export class PlanifierCommand extends IsabelleAutocompleteCommandBase {
  commandData: SlashCommandSubcommandsOnlyBuilder;

  constructor() {
    super();
    this.commandData = new SlashCommandBuilder()
      .setName('planifier')
      .setDescription(
        'Planifier un événement (créé un événement et un salon de forum dédié)',
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('create')
          .setDescription('Créer un nouvel événement'),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('list')
          .setDescription('Afficher la liste des événements planifiés'),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('delete')
          .setDescription('Supprimer un événement planifié')
          .addStringOption((option) =>
            option
              .setName('event')
              .setDescription("L'événement à supprimer")
              .setAutocomplete(true)
              .setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('config')
          .setDescription('Configurer le module planifier')
          .addChannelOption((option) =>
            option
              .setName('forum')
              .setDescription('Le salon forum pour les événements')
              .addChannelTypes(ChannelType.GuildForum)
              .setRequired(true),
          ),
      );
  }

  protected getAutocompleteHandlers(): Record<
    string,
    AutocompleteOptionHandler
  > {
    return {
      event: handleDeleteAutocomplete,
    };
  }

  async executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create':
        await handleCreateSubcommand(interaction);
        break;
      case 'list':
        await handleListSubcommand(interaction);
        break;
      case 'delete':
        await handleDeleteSubcommand(interaction);
        break;
      case 'config':
        await handleConfigSubcommand(interaction);
        break;
    }
  }
}
