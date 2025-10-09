import { db } from '@/db/index.js';
import { birthdays } from '@/db/schema.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { createLogger } from '@/utils/logger.js';
import {
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { eq } from 'drizzle-orm';

const logger = createLogger('birthdays');

export class AnniversaireCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('anniversaire')
    .setDescription('Gérer les anniversaires')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Enregistrer ton anniversaire')
        .addIntegerOption((option) =>
          option
            .setName('jour')
            .setDescription('Jour de naissance (1-31)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(31),
        )
        .addIntegerOption((option) =>
          option
            .setName('mois')
            .setDescription('Mois de naissance (1-12)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12),
        )
        .addIntegerOption((option) =>
          option
            .setName('annee')
            .setDescription("Année de naissance (optionnel, pour l'âge)")
            .setRequired(false)
            .setMinValue(1900)
            .setMaxValue(new Date().getFullYear()),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Voir les prochains anniversaires'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('voir')
        .setDescription("Voir l'anniversaire d'un utilisateur")
        .addUserOption((option) =>
          option
            .setName('utilisateur')
            .setDescription("L'utilisateur dont tu veux voir l'anniversaire")
            .setRequired(true),
        ),
    );

  public async executeCommand(interaction: CommandInteraction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Cette commande ne peut être utilisée que dans un serveur.',
        ephemeral: true,
      });
      return;
    }

    switch (subcommand) {
      case 'set':
        await this.handleSet(interaction);
        break;
      case 'list':
        await this.handleList(interaction);
        break;
      case 'voir':
        await this.handleVoir(interaction);
        break;
      default:
        await interaction.reply({
          content: 'Sous-commande inconnue.',
          ephemeral: true,
        });
    }
  }

  private async handleSet(interaction: CommandInteraction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const day = interaction.options.getInteger('jour', true);
    const month = interaction.options.getInteger('mois', true);
    const year = interaction.options.getInteger('annee') ?? undefined;

    // Validate the date
    const testDate = new Date(year ?? 2000, month - 1, day);
    if (
      testDate.getDate() !== day ||
      testDate.getMonth() !== month - 1 ||
      (year && testDate.getFullYear() !== year)
    ) {
      await interaction.reply({
        content: '❌ Date invalide. Vérifie les valeurs saisies.',
        ephemeral: true,
      });
      return;
    }

    try {
      // Check if birthday already exists
      const existing = await db
        .select()
        .from(birthdays)
        .where(eq(birthdays.userId, interaction.user.id))
        .limit(1);

      if (existing.length > 0) {
        // Update existing birthday
        await db
          .update(birthdays)
          .set({
            day,
            month,
            year,
            guildId: interaction.guildId ?? '',
          })
          .where(eq(birthdays.userId, interaction.user.id));
      } else {
        // Insert new birthday
        await db.insert(birthdays).values({
          userId: interaction.user.id,
          guildId: interaction.guildId ?? '',
          day,
          month,
          year,
        });
      }

      const monthNames = [
        'janvier',
        'février',
        'mars',
        'avril',
        'mai',
        'juin',
        'juillet',
        'août',
        'septembre',
        'octobre',
        'novembre',
        'décembre',
      ];

      await interaction.reply({
        content: `✅ Ton anniversaire a été enregistré le ${String(day)} ${monthNames[month - 1]}${year ? ` ${String(year)}` : ''} ! 🎂`,
        ephemeral: true,
      });

      logger.info(
        { userId: interaction.user.id, day, month, year },
        'Birthday registered',
      );
    } catch (error) {
      logger.error({ error }, 'Failed to save birthday');
      await interaction.reply({
        content:
          "❌ Une erreur est survenue lors de l'enregistrement de ton anniversaire.",
        ephemeral: true,
      });
    }
  }

  private async handleList(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      return;
    }

    try {
      const allBirthdays = await db
        .select()
        .from(birthdays)
        .where(eq(birthdays.guildId, interaction.guildId));

      if (allBirthdays.length === 0) {
        await interaction.reply({
          content: "Aucun anniversaire n'est enregistré pour le moment. 😢",
          ephemeral: true,
        });
        return;
      }

      // Get current date
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      // Sort birthdays by proximity to current date
      const sortedBirthdays = allBirthdays
        .map((birthday) => {
          let daysUntil = 0;

          // Calculate days until birthday
          const birthdayThisYear = new Date(
            now.getFullYear(),
            birthday.month - 1,
            birthday.day,
          );
          const birthdayNextYear = new Date(
            now.getFullYear() + 1,
            birthday.month - 1,
            birthday.day,
          );

          if (birthdayThisYear >= now) {
            daysUntil = Math.floor(
              (birthdayThisYear.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            );
          } else {
            daysUntil = Math.floor(
              (birthdayNextYear.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            );
          }

          return { ...birthday, daysUntil };
        })
        .sort((a, b) => a.daysUntil - b.daysUntil);

      const embed = new EmbedBuilder()
        .setTitle('🎂 Prochains anniversaires')
        .setColor(0xff69b4)
        .setTimestamp();

      const upcomingBirthdays = sortedBirthdays.slice(0, 10);

      for (const birthday of upcomingBirthdays) {
        const monthNames = [
          'janvier',
          'février',
          'mars',
          'avril',
          'mai',
          'juin',
          'juillet',
          'août',
          'septembre',
          'octobre',
          'novembre',
          'décembre',
        ];

        const user = await interaction.client.users.fetch(birthday.userId);
        const dateStr = `${String(birthday.day)} ${monthNames[birthday.month - 1]}`;
        const daysInfo =
          birthday.daysUntil === 0
            ? "🎉 C'est aujourd'hui !"
            : `dans ${String(birthday.daysUntil)} jour${birthday.daysUntil > 1 ? 's' : ''}`;

        let ageInfo = '';
        if (birthday.year) {
          const age =
            now.getFullYear() -
            birthday.year +
            (birthday.month < currentMonth ||
            (birthday.month === currentMonth && birthday.day < currentDay)
              ? 1
              : 0);
          ageInfo = ` (${String(age)} ans)`;
        }

        embed.addFields({
          name: user.username,
          value: `${dateStr}${ageInfo} - ${daysInfo}`,
          inline: false,
        });
      }

      if (sortedBirthdays.length > 10) {
        embed.setFooter({
          text: `... et ${String(sortedBirthdays.length - 10)} autre${sortedBirthdays.length - 10 > 1 ? 's' : ''} anniversaire${sortedBirthdays.length - 10 > 1 ? 's' : ''}`,
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error({ error }, 'Failed to list birthdays');
      await interaction.reply({
        content:
          '❌ Une erreur est survenue lors de la récupération des anniversaires.',
        ephemeral: true,
      });
    }
  }

  private async handleVoir(interaction: CommandInteraction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const targetUser = interaction.options.getUser('utilisateur', true);

    try {
      const birthday = await db
        .select()
        .from(birthdays)
        .where(eq(birthdays.userId, targetUser.id))
        .limit(1);

      if (birthday.length === 0) {
        await interaction.reply({
          content: `${targetUser.username} n'a pas encore enregistré son anniversaire. 😢`,
          ephemeral: true,
        });
        return;
      }

      const monthNames = [
        'janvier',
        'février',
        'mars',
        'avril',
        'mai',
        'juin',
        'juillet',
        'août',
        'septembre',
        'octobre',
        'novembre',
        'décembre',
      ];

      const b = birthday[0];
      const dateStr = `${String(b.day)} ${monthNames[b.month - 1]}${b.year ? ` ${String(b.year)}` : ''}`;

      // Calculate days until birthday
      const now = new Date();
      const birthdayThisYear = new Date(now.getFullYear(), b.month - 1, b.day);
      const birthdayNextYear = new Date(
        now.getFullYear() + 1,
        b.month - 1,
        b.day,
      );

      let daysUntil = 0;
      if (birthdayThisYear >= now) {
        daysUntil = Math.floor(
          (birthdayThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
      } else {
        daysUntil = Math.floor(
          (birthdayNextYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      const daysInfo =
        daysUntil === 0
          ? "🎉 C'est aujourd'hui !"
          : `dans ${String(daysUntil)} jour${daysUntil > 1 ? 's' : ''}`;

      await interaction.reply({
        content: `🎂 L'anniversaire de ${targetUser.username} est le ${dateStr} - ${daysInfo}`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch birthday');
      await interaction.reply({
        content:
          "❌ Une erreur est survenue lors de la récupération de l'anniversaire.",
        ephemeral: true,
      });
    }
  }
}
