import {
  SutomGame,
  SutomGameOptions,
} from '@/modules/sutom/core/sutom-game.js';
import { wordRepository } from '@/modules/sutom/core/word-repository.js';

interface GameInstance {
  game: SutomGame;
  threadId: string;
  /** For daily games, the channel where the hidden board messages should be sent */
  parentChannelId?: string;
  /** Message ID in the parent channel showing the hidden board (for editing) */
  parentMessageId?: string;
}

class GameManager {
  gameInstances: Map<string, GameInstance>;

  constructor() {
    this.gameInstances = new Map<string, GameInstance>();
  }

  createGame(userId: string, threadId: string): boolean {
    if (this.gameInstances.has(userId)) {
      return false;
    }
    this.gameInstances.set(userId, {
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
    userId: string,
    threadId: string,
    parentChannelId: string,
  ): boolean {
    if (this.gameInstances.has(userId)) {
      return false;
    }

    const dailyWord = wordRepository.getDailyWord();
    const gameOptions: SutomGameOptions = {
      specificWord: dailyWord,
      isDailyGame: true,
    };

    this.gameInstances.set(userId, {
      game: new SutomGame(wordRepository, gameOptions),
      threadId,
      parentChannelId,
    });
    return true;
  }

  getGame(userId: string): SutomGame | undefined {
    return this.gameInstances.get(userId)?.game;
  }

  getGameThreadId(userId: string): string | undefined {
    return this.gameInstances.get(userId)?.threadId;
  }

  /**
   * Gets the parent channel ID for daily games.
   */
  getParentChannelId(userId: string): string | undefined {
    return this.gameInstances.get(userId)?.parentChannelId;
  }

  /**
   * Gets the parent message ID for editing the hidden board.
   */
  getParentMessageId(userId: string): string | undefined {
    return this.gameInstances.get(userId)?.parentMessageId;
  }

  /**
   * Sets the parent message ID after posting the hidden board.
   */
  setParentMessageId(userId: string, messageId: string): void {
    const instance = this.gameInstances.get(userId);
    if (instance) {
      instance.parentMessageId = messageId;
    }
  }

  getGameByThreadId(
    threadId: string,
  ): { userId: string; game: SutomGame } | undefined {
    for (const [userId, instance] of this.gameInstances.entries()) {
      if (instance.threadId === threadId) {
        return { userId, game: instance.game };
      }
    }
    return undefined;
  }

  deleteGame(id: string) {
    this.gameInstances.delete(id);
  }
}

export const sutomGameManager = new GameManager();
