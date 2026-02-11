import { db } from '@/db/index.js';
import { birthdays } from '@/db/schema.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { configManager } from '@/manager/config.manager.js';
import { createLogger } from '@/utils/logger.js';
import { safelySendMessage } from '@/utils/safely-send-message.js';
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { and, eq } from 'drizzle-orm';

const logger = createLogger('birthday-command');

export class BirthdayCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('anniversaire')
    .setDescription('Gère les anniversaires')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('definir')
        .setDescription('Définit ton anniversaire')
        .addIntegerOption((option) =>
          option
            .setName('jour')
            .setDescription('Jour de naissance (1-31)')
            .setMinValue(1)
            .setMaxValue(31)
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('mois')
            .setDescription('Mois de naissance (1-12)')
            .setMinValue(1)
            .setMaxValue(12)
            .setRequired(true),
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
        .setName('liste')
        .setDescription('Liste les prochains anniversaires'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('supprimer')
        .setDescription('Supprime ton anniversaire'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('salon')
        .setDescription("Définit le salon d'annonce des anniversaires")
        .addChannelOption((option) =>
          option
            .setName('salon')
            .setDescription('Le salon où annoncer les anniversaires')
            .setRequired(true),
        ),
    );

  async executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'definir':
          await this.handleSet(interaction);
          break;
        case 'liste':
          await this.handleList(interaction);
          break;
        case 'supprimer':
          await this.handleRemove(interaction);
          break;
        case 'salon':
          await this.handleSetChannel(interaction);
          break;
        default:
          await interaction.reply({
            content: 'Commande inconnue.',
            ephemeral: true,
          });
      }
    } catch (error) {
      logger.error({ error }, 'Error executing birthday command');
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'Une erreur est survenue lors de l\'exécution de la commande.',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: 'Une erreur est survenue lors de l\'exécution de la commande.',
          ephemeral: true,
        });
      }
    }
  }

  private async handleSet(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const day = interaction.options.getInteger('jour', true);
    const month = interaction.options.getInteger('mois', true);
    const year = interaction.options.getInteger('annee');
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (!guildId) {
      await interaction.reply({
        content: 'Cette commande ne peut être utilisée que dans un serveur.',
        ephemeral: true,
      });
      return;
    }

    // Validate date (using 2000 as leap year to allow Feb 29)
    const date = new Date(year ?? 2000, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) {
      await interaction.reply({
        content: `La date ${String(day)}/${String(month)} n'est pas valide.`,
        ephemeral: true,
      });
      return;
    }

    await db
      .insert(birthdays)
      .values({
        guildId,
        userId,
        day,
        month,
        year: year ?? null,
      })
      .onConflictDoUpdate({
        target: [birthdays.guildId, birthdays.userId],
        set: {
          day,
          month,
          year: year ?? null,
          lastCelebratedYear: 0, // Reset so it can trigger again if changed
        },
      });

    const dateStr = `${day < 10 ? '0' + String(day) : String(day)}/${month < 10 ? '0' + String(month) : String(month)}`;
    await interaction.reply({
      content: `Ton anniversaire a été défini au ${dateStr}${
        year ? '/' + String(year) : ''
      }.`,
      ephemeral: true,
    });
  }

  private async handleList(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        content: 'Cette commande ne peut être utilisée que dans un serveur.',
        ephemeral: true,
      });
      return;
    }

    const allBirthdays = await db
      .select()
      .from(birthdays)
      .where(eq(birthdays.guildId, guildId));

    if (allBirthdays.length === 0) {
      await interaction.reply('Aucun anniversaire enregistré dans ce serveur.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    const upcoming = allBirthdays
      .map((b) => {
        let nextBirthday = new Date(currentYear, b.month - 1, b.day);

        // If birthday has passed this year, set to next year
        if (nextBirthday < today) {
          nextBirthday = new Date(currentYear + 1, b.month - 1, b.day);
        }

        return {
          ...b,
          nextBirthday,
        };
      })
      .sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime())
      .slice(0, 10);

    const lines = await Promise.all(
      upcoming.map(async (b) => {
        const member = await interaction.guild?.members
          .fetch(b.userId)
          .catch(() => null);
        const name = member?.displayName ?? `<@${b.userId}>`;

        const dayStr = b.day < 10 ? '0' + String(b.day) : String(b.day);
        const monthStr = b.month < 10 ? '0' + String(b.month) : String(b.month);
        const dateStr = `${dayStr}/${monthStr}`;

        // Calculate age for next birthday
        let ageStr = '';
        if (b.year) {
            const age = b.nextBirthday.getFullYear() - b.year;
            ageStr = ` (${String(age)} ans)`;
        }

        return `- **${name}**: ${dateStr}${ageStr}`;
      }),
    );

    await safelySendMessage(interaction, `🎉 **Prochains anniversaires :**\n${lines.join('\n')}`);
  }

  private async handleRemove(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (!guildId) {
        await interaction.reply({
            content: 'Cette commande ne peut être utilisée que dans un serveur.',
            ephemeral: true
        });
        return;
    }

    const result = await db
      .delete(birthdays)
      .where(and(eq(birthdays.guildId, guildId), eq(birthdays.userId, userId)))
      .returning();

    if (result.length === 0) {
      await interaction.reply({
        content: "Tu n'as pas d'anniversaire enregistré.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: 'Ton anniversaire a été supprimé.',
        ephemeral: true,
      });
    }
  }

  private async handleSetChannel(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: 'Tu dois être administrateur pour utiliser cette commande.',
            ephemeral: true
        });
        return;
    }

    const guildId = interaction.guildId;
    if (!guildId) return;

    const channel = interaction.options.getChannel('salon', true);

    const config = configManager.getGuild(guildId);
    config.BIRTHDAY_CHANNEL_ID = channel.id;

    await configManager.saveGuild(guildId, config);

    await interaction.reply({
        content: `Le salon d'anniversaire a été défini sur <#${channel.id}>.`,
        ephemeral: true
    });
  }
}
