import { IsabelleModule, ModuleContributor } from '@/modules/bot-module.js';
import { client } from '@/index.js';
import { SutomCommand } from '@/modules/sutom/commands/sutom.command.js';
import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';
import { sutomMessageListener } from '@/modules/sutom/events/sutom-message.listener.js';
import { createLogger } from '@/utils/logger.js';
import { Events, Message } from 'discord.js';

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
      const removed = sutomGameManager.sweepIdleGames(GAME_MAX_IDLE_MS);

      if (removed > 0) {
        logger.info({ removed }, 'Reaped idle SUTOM games');
      }
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
}
