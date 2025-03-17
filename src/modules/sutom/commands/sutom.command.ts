import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export class SutomCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('sutom')
    .setDescription(
      'Joue une partie de sutom ! Chaque joueur a sa propre instance de jeu.',
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('start')
        .setDescription('Commence une partie de sutom'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('mot')
        .setDescription('Propose un mot pour la partie de sutom')
        .addStringOption((option) =>
          option
            .setName('mot')
            .setDescription('Le mot à proposer')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('stop-sutom')
        .setDescription('Arrête ta partie de sutom !'),
    );

  public executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    console.log('[Sutom] Interaction:', interaction);
    console.log(interaction.options.getSubcommand());

    switch (interaction.options.getSubcommand()) {
      case 'mot':
        break;
    }

    interaction.reply('Sutom command').catch((e: unknown) => {
      console.error(e);
    });
  }
}
