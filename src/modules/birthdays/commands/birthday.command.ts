import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { handleConfigBirthdayCommand } from '@/modules/birthdays/commands/config.command.js';
import { handleListBirthdaysCommand } from '@/modules/birthdays/commands/list.command.js';
import { handleRemoveBirthdayCommand } from '@/modules/birthdays/commands/remove.command.js';
import { handleSetBirthdayCommand } from '@/modules/birthdays/commands/set.command.js';
import { handleTestBirthdayCommand } from '@/modules/birthdays/commands/test.command.js';
import { handleUpcomingBirthdaysCommand } from '@/modules/birthdays/commands/upcoming.command.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export class BirthdayCommand implements IsabelleCommand {
  commandData:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('anniversaires')
    .setDescription('Gère les anniversaires des membres du serveur')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription("Définir une date d'anniversaire")
        .addStringOption((option) =>
          option
            .setName('date')
            .setDescription("Votre date d'anniversaire au format JJ/MM")
            .setRequired(true),
        )
        .addUserOption((option) =>
          option
            .setName('utilisateur')
            .setDescription(
              "L'anniversaire de quel utilisateur voulez-vous définir ?",
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription("Supprimer une date d'anniversaire")
        .addUserOption((option) =>
          option
            .setName('utilisateur')
            .setDescription(
              "L'anniversaire de quel utilisateur voulez-vous supprimer ?",
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Afficher la liste des anniversaires du serveur'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('prochains')
        .setDescription('Afficher les prochains anniversaires du serveur'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('config')
        .setDescription(
          "Configurer le salon d'annonce des anniversaires (admin)",
        )
        .addChannelOption((option) =>
          option
            .setName('salon')
            .setDescription('Le salon où annoncer les anniversaires')
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement,
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('test')
        .setDescription(
          'Envoyer une annonce de test dans le salon configuré (admin)',
        ),
    );

  async executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'set':
        await handleSetBirthdayCommand(interaction);
        break;
      case 'remove':
        await handleRemoveBirthdayCommand(interaction);
        break;
      case 'list':
        await handleListBirthdaysCommand(interaction);
        break;
      case 'prochains':
        await handleUpcomingBirthdaysCommand(interaction);
        break;
      case 'config':
        await handleConfigBirthdayCommand(interaction);
        break;
      case 'test':
        await handleTestBirthdayCommand(interaction);
        break;
      default:
        await interaction.reply({
          content: 'Sous-commande inconnue.',
          ephemeral: true,
        });
    }
  }
}
