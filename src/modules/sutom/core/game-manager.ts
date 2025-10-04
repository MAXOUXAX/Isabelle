import { SutomGame } from '@/modules/sutom/core/sutom-game.js';
import { wordRepository } from '@/modules/sutom/core/word-repository.js';

interface GameInstance {
  game: SutomGame;
  threadId: string;
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

  getGame(userId: string): SutomGame | undefined {
    return this.gameInstances.get(userId)?.game;
  }

  getGameThreadId(userId: string): string | undefined {
    return this.gameInstances.get(userId)?.threadId;
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
