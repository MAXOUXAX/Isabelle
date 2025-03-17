import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import startSutomSubcommand from '@/modules/sutom/commands/subcommands/startSutom.js';
import stopSutomSubcommand from '@/modules/sutom/commands/subcommands/stopSutom.js';
import guessWordSubcommand from '@/modules/sutom/commands/subcommands/sutomGuess.js';
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
        .setName('stop')
        .setDescription('Arrête ta partie de sutom !'),
    );

  public executeCommand(
    interaction: ChatInputCommandInteraction,
  ) {
    switch (interaction.options.getSubcommand()) {
      case 'mot':
        guessWordSubcommand(interaction)
        break;
      case 'start':
        startSutomSubcommand(interaction)
        break;
      case 'stop':
        stopSutomSubcommand(interaction)
        break;
      default:
        interaction.reply('not a valid subcommand').catch((e: unknown) => {
          console.error(e);
        });
        break;
    }
  }
}
