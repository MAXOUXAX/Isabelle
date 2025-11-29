import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import startSutomSubcommand from '@/modules/sutom/commands/subcommands/start-sutom.js';
import stopSutomSubcommand from '@/modules/sutom/commands/subcommands/stop-sutom.js';
import guessWordSubcommand from '@/modules/sutom/commands/subcommands/sutom-guess.js';
import { createLogger } from '@/utils/logger.js';
import { voidAndTrackError } from '@/utils/promises.js';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

const logger = createLogger('sutom-command');

export class SutomCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('sutom')
    .setDescription(
      'Permet de jouer au SUTOM, le jeu où tu dois deviner un mot en un nombre limité de tentatives !',
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('start')
        .setDescription(
          "Lance une partie de SUTOM, uniquement si tu n'en as pas déjà une en cours !",
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('mot')
        .setDescription(
          'Propose un mot pour ta partie de SUTOM (fonctionne uniquement dans ton thread)',
        )
        .addStringOption((option) =>
          option
            .setName('tentative')
            .setDescription('À quel mot penses-tu ?')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('stop').setDescription('Arrête ta partie de SUTOM !'),
    );

  public executeCommand(interaction: ChatInputCommandInteraction) {
    switch (interaction.options.getSubcommand()) {
      case 'mot':
        voidAndTrackError(guessWordSubcommand(interaction));
        break;
      case 'start':
        voidAndTrackError(startSutomSubcommand(interaction));
        break;
      case 'stop':
        voidAndTrackError(stopSutomSubcommand(interaction));
        break;
      default:
        voidAndTrackError(
          interaction.reply(
            'Un problème est survenu, la sous-commande que tu as utilisée est inconnue.',
          ),
        );
        logger.error(
          {
            interaction: {
              id: interaction.id,
              guildId: interaction.guildId,
              userId: interaction.user.id,
              commandName: interaction.commandName,
              subcommand: interaction.options.getSubcommand(false),
            },
          },
          'Unknown subcommand used in /sutom command',
        );
        break;
    }
  }
}
