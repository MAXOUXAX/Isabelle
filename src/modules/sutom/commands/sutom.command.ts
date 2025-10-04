import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import startSutomSubcommand from '@/modules/sutom/commands/subcommands/start-sutom.js';
import stopSutomSubcommand from '@/modules/sutom/commands/subcommands/stop-sutom.js';
import guessWordSubcommand from '@/modules/sutom/commands/subcommands/sutom-guess.js';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { createLogger } from '@/utils/logger.js';

const logger = createLogger('sutom-command');

export class SutomCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('sutom')
    .setDescription(
      'Joue une partie de SUTOM dans un thread privé ! Chaque joueur a sa propre instance de jeu.',
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('start')
        .setDescription('Commence une partie de SUTOM dans un thread privé'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('mot')
        .setDescription(
          'Propose un mot pour ta partie de SUTOM (uniquement dans ton thread)',
        )
        .addStringOption((option) =>
          option
            .setName('mot')
            .setDescription('Le mot que tu proposes')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('stop').setDescription('Arrête ta partie de SUTOM !'),
    );

  public executeCommand(interaction: ChatInputCommandInteraction) {
    switch (interaction.options.getSubcommand()) {
      case 'mot':
        void guessWordSubcommand(interaction);
        break;
      case 'start':
        void startSutomSubcommand(interaction);
        break;
      case 'stop':
        void stopSutomSubcommand(interaction);
        break;
      default:
        interaction.reply('not a valid subcommand').catch((e: unknown) => {
          logger.error(e);
        });
        break;
    }
  }
}
