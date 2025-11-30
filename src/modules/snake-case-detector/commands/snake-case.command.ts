import { db } from '@/db/index.js';
import { snakeCaseTargets } from '@/db/schema.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { invalidateSnakeCaseCache } from '@/modules/snake-case-detector/events/snake-case.listener.js';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { and, eq } from 'drizzle-orm';

export class SnakeCaseCommand implements IsabelleCommand {
  commandData: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName('snake-case')
    .setDescription('Configure la détection des messages en snake_case')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ajouter')
        .setDescription(
          'Ajoute un utilisateur à surveiller pour les messages en snake_case',
        )
        .addUserOption((option) =>
          option
            .setName('utilisateur')
            .setDescription("L'utilisateur à surveiller")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('retirer')
        .setDescription('Retire un utilisateur de la surveillance snake_case')
        .addUserOption((option) =>
          option
            .setName('utilisateur')
            .setDescription("L'utilisateur à retirer")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('liste')
        .setDescription(
          'Affiche la liste des utilisateurs surveillés pour snake_case',
        ),
    );

  async executeCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Cette commande ne peut être utilisée que dans un serveur.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guildId;

    switch (subcommand) {
      case 'ajouter':
        await this.handleAdd(interaction, guildId);
        break;
      case 'retirer':
        await this.handleRemove(interaction, guildId);
        break;
      case 'liste':
        await this.handleList(interaction, guildId);
        break;
      default:
        await interaction.reply({
          content: 'Sous-commande inconnue.',
          flags: MessageFlags.Ephemeral,
        });
    }
  }

  private async handleAdd(
    interaction: ChatInputCommandInteraction,
    guildId: string,
  ) {
    const user = interaction.options.getUser('utilisateur', true);

    // Check if user is already a target
    const existing = await db
      .select()
      .from(snakeCaseTargets)
      .where(
        and(
          eq(snakeCaseTargets.guildId, guildId),
          eq(snakeCaseTargets.userId, user.id),
        ),
      );

    if (existing.length > 0) {
      await interaction.reply({
        content: `${user.displayName} est déjà surveillé(e) pour les messages en snake_case.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Add the user as a target
    await db.insert(snakeCaseTargets).values({
      guildId,
      userId: user.id,
      updatedAt: new Date(),
    });

    await invalidateSnakeCaseCache(guildId);

    await interaction.reply({
      content: `🐍 ${user.displayName} est maintenant surveillé(e) pour les messages en snake_case !`,
      flags: MessageFlags.Ephemeral,
    });
  }

  private async handleRemove(
    interaction: ChatInputCommandInteraction,
    guildId: string,
  ) {
    const user = interaction.options.getUser('utilisateur', true);

    const result = await db
      .delete(snakeCaseTargets)
      .where(
        and(
          eq(snakeCaseTargets.guildId, guildId),
          eq(snakeCaseTargets.userId, user.id),
        ),
      );

    if (result.rowsAffected === 0) {
      await interaction.reply({
        content: `${user.displayName} n'était pas surveillé(e) pour les messages en snake_case.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await invalidateSnakeCaseCache(guildId);

    await interaction.reply({
      content: `✅ ${user.displayName} n'est plus surveillé(e) pour les messages en snake_case.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  private async handleList(
    interaction: ChatInputCommandInteraction,
    guildId: string,
  ) {
    const targets = await db
      .select()
      .from(snakeCaseTargets)
      .where(eq(snakeCaseTargets.guildId, guildId));

    if (targets.length === 0) {
      await interaction.reply({
        content:
          "Aucun utilisateur n'est surveillé pour les messages en snake_case sur ce serveur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const userList = targets.map((t) => `• <@${t.userId}>`).join('\n');

    await interaction.reply({
      content: `🐍 **Utilisateurs surveillés pour snake_case:**\n${userList}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
