import {
  SutomGame,
  SutomGameOptions,
} from '@/modules/sutom/core/sutom-game.js';
import { wordRepository } from '@/modules/sutom/core/word-repository.js';

interface GameInstance {
  guildId: string;
  userId: string;
  lastActivityAt: number;
  game: SutomGame;
  threadId: string;
  /** For daily games, the channel where the hidden board messages should be sent */
  parentChannelId?: string;
  /** Message ID in the parent channel showing the hidden board (for editing) */
  parentMessageId?: string;
  expirationNoticeSent?: boolean;
  expirationBoardUpdated?: boolean;
  expirationThreadArchived?: boolean;
}

export interface IdleGame {
  guildId: string;
  userId: string;
  game: SutomGame;
  threadId: string;
  parentChannelId?: string;
  parentMessageId?: string;
  expirationNoticeSent: boolean;
  expirationBoardUpdated: boolean;
  expirationThreadArchived: boolean;
}

function buildGameKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

class GameManager {
  gameInstances: Map<string, GameInstance>;

  constructor() {
    this.gameInstances = new Map<string, GameInstance>();
  }

  createGame(guildId: string, userId: string, threadId: string): boolean {
    const key = buildGameKey(guildId, userId);
    if (this.gameInstances.has(key)) {
      return false;
    }
    this.gameInstances.set(key, {
      guildId,
      userId,
      lastActivityAt: Date.now(),
      game: new SutomGame(wordRepository),
      threadId,
    });
    return true;
  }

  /**
   * Creates a daily word game with a private thread.
   * @param userId The user's ID
   * @param threadId The private thread ID
   * @param parentChannelId The channel where hidden board messages will be posted
   * @returns true if the game was created successfully
   */
  createDailyGame(
    guildId: string,
    userId: string,
    threadId: string,
    parentChannelId: string,
  ): boolean {
    const key = buildGameKey(guildId, userId);
    if (this.gameInstances.has(key)) {
      return false;
    }

    const dailyWord = wordRepository.getDailyWord();
    const gameOptions: SutomGameOptions = {
      specificWord: dailyWord,
      isDailyGame: true,
    };

    this.gameInstances.set(key, {
      guildId,
      userId,
      lastActivityAt: Date.now(),
      game: new SutomGame(wordRepository, gameOptions),
      threadId,
      parentChannelId,
    });
    return true;
  }

  getGame(guildId: string, userId: string): SutomGame | undefined {
    return this.gameInstances.get(buildGameKey(guildId, userId))?.game;
  }

  getGameThreadId(guildId: string, userId: string): string | undefined {
    return this.gameInstances.get(buildGameKey(guildId, userId))?.threadId;
  }

  /**
   * Gets the parent channel ID for daily games.
   */
  getParentChannelId(guildId: string, userId: string): string | undefined {
    return this.gameInstances.get(buildGameKey(guildId, userId))
      ?.parentChannelId;
  }

  /**
   * Gets the parent message ID for editing the hidden board.
   */
  getParentMessageId(guildId: string, userId: string): string | undefined {
    return this.gameInstances.get(buildGameKey(guildId, userId))
      ?.parentMessageId;
  }

  /**
   * Sets the parent message ID after posting the hidden board.
   */
  setParentMessageId(guildId: string, userId: string, messageId: string): void {
    const instance = this.gameInstances.get(buildGameKey(guildId, userId));
    if (instance) {
      instance.parentMessageId = messageId;
    }
  }

  getGameByThreadId(
    threadId: string,
  ): { guildId: string; userId: string; game: SutomGame } | undefined {
    for (const instance of this.gameInstances.values()) {
      if (instance.threadId === threadId) {
        return {
          guildId: instance.guildId,
          userId: instance.userId,
          game: instance.game,
        };
      }
    }
    return undefined;
  }

  deleteGame(guildId: string, userId: string, expectedGame?: SutomGame): void {
    const key = buildGameKey(guildId, userId);
    const instance = this.gameInstances.get(key);
    if (expectedGame && instance?.game !== expectedGame) return;
    this.gameInstances.delete(key);
  }

  touch(guildId: string, userId: string): void {
    const instance = this.gameInstances.get(buildGameKey(guildId, userId));
    if (instance) {
      instance.lastActivityAt = Date.now();
    }
  }

  /** Returns idle games for asynchronous cleanup without dropping their tracking. */
  sweepIdleGames(maxIdleMs: number, now: number = Date.now()): IdleGame[] {
    return [...this.gameInstances.values()]
      .filter((instance) => now - instance.lastActivityAt > maxIdleMs)
      .map((instance) => ({
        guildId: instance.guildId,
        userId: instance.userId,
        game: instance.game,
        threadId: instance.threadId,
        parentChannelId: instance.parentChannelId,
        parentMessageId: instance.parentMessageId,
        expirationNoticeSent: instance.expirationNoticeSent ?? false,
        expirationBoardUpdated: instance.expirationBoardUpdated ?? false,
        expirationThreadArchived: instance.expirationThreadArchived ?? false,
      }));
  }

  markExpirationStep(
    guildId: string,
    userId: string,
    step: 'noticeSent' | 'boardUpdated' | 'threadArchived',
    expectedGame?: SutomGame,
  ): void {
    const instance = this.gameInstances.get(buildGameKey(guildId, userId));
    if (!instance || (expectedGame && instance.game !== expectedGame)) return;

    if (step === 'noticeSent') instance.expirationNoticeSent = true;
    if (step === 'boardUpdated') instance.expirationBoardUpdated = true;
    if (step === 'threadArchived') instance.expirationThreadArchived = true;
  }
}

export const sutomGameManager = new GameManager();
