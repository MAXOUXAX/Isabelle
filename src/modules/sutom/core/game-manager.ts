import { SutomGame } from '@/modules/sutom/core/sutom-game.js';
import { wordRepository } from '@/modules/sutom/core/word-repository.js';

class GameManager {
  gameInstances: Map<string, SutomGame>;

  constructor() {
    this.gameInstances = new Map<string, SutomGame>();
  }

  createGame(userId: string): boolean {
    if (this.gameInstances.has(userId)) {
      return false;
    }
    this.gameInstances.set(userId, new SutomGame(wordRepository));
    return true;
  }

  getGame(userId: string): SutomGame | undefined {
    return this.gameInstances.get(userId);
  }

  deleteGame(id: string) {
    this.gameInstances.delete(id);
  }
}

export const sutomGameManager = new GameManager();
