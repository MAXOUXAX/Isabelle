import { db } from '@/db/index.js';
import { guildConfigs } from '@/db/schema.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { configManager } from '@/manager/config.manager.js';
import {
  getBirthday,
  removeBirthday,
  setBirthday,
} from '@/modules/birthdays/db/birthday.db-operations.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionsBitField,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

const logger = createLogger('birthday-command');

export class BirthdayCommand implements IsabelleCommand {
  commandData: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName('anniversaire')
    .setDescription('Gérer les anniversaires')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Définir son anniversaire')
        .addIntegerOption((option) =>
          option
            .setName('jour')
            .setDescription('Jour de naissance')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(31),
        )
        .addIntegerOption((option) =>
          option
            .setName('mois')
            .setDescription('Mois de naissance')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12),
        )
        .addIntegerOption((option) =>
          option
            .setName('annee')
            .setDescription('Année de naissance (optionnel)')
            .setMinValue(1900)
            .setMaxValue(new Date().getFullYear()),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('get')
        .setDescription('Voir un anniversaire')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription("L'utilisateur dont on veut voir l'anniversaire"),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Supprimer son anniversaire'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('config')
        .setDescription("Configurer le canal d'annonces (Admin uniquement)")
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Le canal pour les annonces')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    );

  async executeCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'set':
        await this.handleSet(interaction);
        break;
      case 'get':
        await this.handleGet(interaction);
        break;
      case 'delete':
        await this.handleDelete(interaction);
        break;
      case 'config':
        await this.handleConfig(interaction);
        break;
      default:
        await interaction.reply({
          content: 'Sous-commande inconnue.',
          flags: MessageFlags.Ephemeral,
        });
    }
  }

  private async handleSet(interaction: ChatInputCommandInteraction) {
    const day = interaction.options.getInteger('jour', true);
    const month = interaction.options.getInteger('mois', true);
    const year = interaction.options.getInteger('annee');

    if (!this.isValidDate(day, month, year)) {
      await interaction.reply({
        content: 'Date invalide.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await setBirthday(interaction.user.id, day, month, year ?? undefined);
      await interaction.reply({
        content: `Anniversaire enregistré : ${String(day)}/${String(month)}${year ? '/' + String(year) : ''}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      logger.error({ error }, 'Error setting birthday');
      await interaction.reply({
        content: "Une erreur est survenue lors de l'enregistrement.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  private async handleGet(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') ?? interaction.user;

    try {
      const birthday = await getBirthday(user.id);
      if (birthday === null) {
        await interaction.reply({
          content: `${user.username} n'a pas défini son anniversaire.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply({
        content: `L'anniversaire de ${user.username} est le ${String(birthday.day)}/${String(birthday.month)}${birthday.year ? '/' + String(birthday.year) : ''}.`,
      });
    } catch (error) {
      logger.error({ error }, 'Error getting birthday');
      await interaction.reply({
        content: 'Une erreur est survenue.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  private async handleDelete(interaction: ChatInputCommandInteraction) {
    try {
      const success = await removeBirthday(interaction.user.id);
      if (success) {
        await interaction.reply({
          content: 'Ton anniversaire a été supprimé.',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "Tu n'as pas d'anniversaire enregistré.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      logger.error({ error }, 'Error deleting birthday');
      await interaction.reply({
        content: 'Une erreur est survenue.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  private async handleConfig(interaction: ChatInputCommandInteraction) {
    if (
      !interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)
    ) {
      await interaction.reply({
        content: "Tu n'as pas les droits pour faire ça.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.options.getChannel('canal', true);
    const guildId = interaction.guildId;

    if (!guildId) return;

    try {
      const currentConfig = configManager.getGuild(guildId);
      const newConfig = { ...currentConfig, BIRTHDAY_CHANNEL_ID: channel.id };

      // Update DB
      await db
        .insert(guildConfigs)
        .values({
          id: guildId,
          config: newConfig,
        })
        .onConflictDoUpdate({
          target: [guildConfigs.id],
          set: { config: newConfig },
        });

      // Update cache
      configManager.setGuild(guildId, newConfig);

      await interaction.reply({
        content: `Le canal d'annonces d'anniversaires a été défini sur <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      logger.error({ error }, 'Error configuring birthday channel');
      await interaction.reply({
        content: 'Une erreur est survenue lors de la configuration.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  private isValidDate(
    day: number,
    month: number,
    year?: number | null,
  ): boolean {
    const date = new Date(year ?? 2000, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1;
  }
}
