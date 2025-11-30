import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { executeLeaderboardCommand } from '@/modules/russian-roulette/commands/russian-roulette-leaderboard.command.ts.js';
import { executePlayCommand } from '@/modules/russian-roulette/commands/russian-roulette-play.command.js';
import { voidAndTrackError } from '@/utils/promises.js';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export class RussianRouletteCommand implements IsabelleCommand {
  commandData: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName('roulette-russe')
    .addSubcommand((subcommand) =>
      subcommand.setName('jouer').setDescription('Jouer à la roulette russe'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('classement')
        .setDescription('Voir vos statistiques à la roulette russe'),
    )
    .setDescription(
      "Joue à la roulette russe pour avoir une chance d'être touché(e) !",
    );

  async executeCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'classement') {
      voidAndTrackError(executeLeaderboardCommand(interaction));
      return;
    }

    if (subcommand === 'jouer') {
      voidAndTrackError(executePlayCommand(interaction));
      return;
    } else {
      await interaction.reply({
        content: 'Sous-commande inconnue.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }
}
