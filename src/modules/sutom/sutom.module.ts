import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { client } from '@/index.js';
import { SutomCommand } from '@/modules/sutom/commands/sutom.command.js';
import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { sutomMessageListener } from '@/modules/sutom/events/sutom-message.listener.js';
import { createLogger } from '@/utils/logger.js';
import { Events, Message, TextChannel } from 'discord.js';

const logger = createLogger('sutom-module');

/** Games with no activity for this long are abandoned and get reaped. */
const GAME_MAX_IDLE_MS = 6 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

export class SutomModule extends IsabelleModule {
  private sweepInterval: ReturnType<typeof setInterval> | null = null;
  readonly name = 'Sutom';
  get contributors(): ModuleContributor[] {
    return [
      {
        displayName: 'Tristan',
        githubUsername: 'Ozraam',
      },
      {
        displayName: 'Maxence',
        githubUsername: 'MAXOUXAX',
      },
    ];
  }

  init(): void {
    this.registerCommands([new SutomCommand()]);
    client.on(Events.MessageCreate, this.handleMessageCreate);

    this.sweepInterval = setInterval(() => {
      void this.cleanupIdleGames();
    }, SWEEP_INTERVAL_MS);
  }

  destroy(): void {
    if (!this.sweepInterval) {
      return;
    }

    clearInterval(this.sweepInterval);
    this.sweepInterval = null;
  }

  private handleMessageCreate = (message: Message): void => {
    sutomMessageListener(message).catch((error: unknown) => {
      logger.error({ error }, 'Error processing SUTOM message:');
    });
  };

  private async cleanupIdleGames(): Promise<void> {
    const expiredGames = sutomGameManager.sweepIdleGames(GAME_MAX_IDLE_MS);

    for (const expired of expiredGames) {
      const { guildId, userId } = expired;
      let cleanupComplete = true;

      if (expired.game.isDailyGame && !expired.expirationBoardUpdated) {
        if (expired.parentChannelId && expired.parentMessageId) {
          try {
            const parentChannel = await client.channels.fetch(
              expired.parentChannelId,
            );
            if (parentChannel instanceof TextChannel) {
              const parentMessage = await parentChannel.messages.fetch(
                expired.parentMessageId,
              );
              const { embed, attachment } = expired.game.buildBoard(
                `<@${userId}> n'a pas terminé le mot du jour à temps.`,
                { hideLetters: true },
              );
              await parentMessage.edit({
                embeds: [embed],
                files: [attachment],
              });
            } else {
              logger.warn(
                { parentChannelId: expired.parentChannelId, userId },
                'Could not find daily SUTOM parent channel during expiration',
              );
            }
            sutomGameManager.markExpirationStep(
              guildId,
              userId,
              'boardUpdated',
            );
          } catch (error) {
            cleanupComplete = false;
            logger.error(
              { error, userId },
              'Failed to update expired daily SUTOM board',
            );
          }
        } else {
          logger.warn(
            { userId },
            'Expired daily SUTOM game has no parent message to update',
          );
          sutomGameManager.markExpirationStep(guildId, userId, 'boardUpdated');
        }
      }

      if (!expired.expirationNoticeSent || !expired.expirationThreadArchived) {
        try {
          const thread = await client.channels.fetch(expired.threadId);
          if (thread?.isThread()) {
            if (!expired.expirationNoticeSent) {
              await thread.send(
                'Cette partie a expiré après 6 heures sans activité. Le mot était **' +
                  `${expired.game.word.toUpperCase()}**. Le thread va être archivé.`,
              );
              sutomGameManager.markExpirationStep(
                guildId,
                userId,
                'noticeSent',
              );
            }
            if (!expired.expirationThreadArchived) {
              await thread.setArchived(true, 'Partie SUTOM inactive expirée');
              sutomGameManager.markExpirationStep(
                guildId,
                userId,
                'threadArchived',
              );
            }
          } else {
            sutomGameManager.markExpirationStep(guildId, userId, 'noticeSent');
            sutomGameManager.markExpirationStep(
              guildId,
              userId,
              'threadArchived',
            );
          }
        } catch (error) {
          cleanupComplete = false;
          logger.error(
            { error, threadId: expired.threadId },
            'Failed to close expired SUTOM thread',
          );
        }
      }

      const current = sutomGameManager
        .sweepIdleGames(GAME_MAX_IDLE_MS)
        .find((game) => game.guildId === guildId && game.userId === userId);
      if (
        cleanupComplete &&
        current?.expirationNoticeSent &&
        current.expirationThreadArchived &&
        (!expired.game.isDailyGame || current.expirationBoardUpdated)
      ) {
        sutomGameManager.deleteGame(guildId, userId);
        logger.info({ guildId, userId }, 'Expired idle SUTOM game');
      }
    }
  }
}
