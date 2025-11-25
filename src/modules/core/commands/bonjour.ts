import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { commandManager } from '@/manager/commands/command.manager.js';
import { buildBonjourMessage } from '@/modules/core/messages/bonjour/bonjour-message.js';
import { moduleManager } from '@/modules/module-manager.js';
import { createLogger } from '@/utils/logger.js';
import { getTodaysLessons } from '@/utils/schedule.js';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../../../../package.json') as { version: string };

const logger = createLogger('bonjour-command');

export class Bonjour implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('bonjour')
    .setDescription(
      'Découvre un résumé de la journée, ainsi que des informations utiles sur Isabelle !',
    );

  public async executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const promotedCommands = this.getPromotedCommands();
      const promotedCommandData = promotedCommands.map((command) =>
        command.commandData.toJSON(),
      );

      let hasScheduleError = false;
      let lessons: Awaited<ReturnType<typeof getTodaysLessons>> = [];
      try {
        lessons = await getTodaysLessons();
      } catch (error) {
        hasScheduleError = true;
        logger.error({ error }, "Failed to retrieve today's lessons");
      }

      const container = buildBonjourMessage({
        displayName: interaction.user.displayName,
        lessons,
        hasScheduleError,
        promotedCommands: promotedCommandData,
        stats: {
          version,
          moduleCount: moduleManager.modules.length,
          commandCount: commandManager.getCommandCountIncludingSubcommands(),
        },
      });

      await interaction.editReply({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
      });
    } catch (error) {
      logger.error({ error }, 'Failed to execute bonjour command');
      await interaction.editReply({
        content:
          'Impossible de préparer ton résumé du jour pour le moment. Réessaie dans quelques instants.',
      });
    }
  }

  private getPromotedCommands(): IsabelleCommand[] {
    return [
      commandManager.findByName('roulette-russe'),
      commandManager.findByName('sutom'),
      commandManager.findByName('roast'),
    ].filter((command): command is IsabelleCommand => command !== undefined);
  }
}
