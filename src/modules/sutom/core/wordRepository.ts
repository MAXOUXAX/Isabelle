import * as fs from 'fs';

export interface WordRepository {
  getRandomWord(): string;
  wordExists(word: string): boolean;
}

class OfflineWordRepository implements WordRepository {
  wordList: string[] = [];
  constructor() {
    const fileContent = fs.readFileSync(
      'src/modules/sutom/core/mots.filteted.txt',
      'utf-8',
    );
    this.wordList = fileContent
      .split('\n')
      .filter((word) => word.trim() !== '')
      .map((word) => word.trim());
  }

  getRandomWord(): string {
    return this.wordList[Math.floor(Math.random() * this.wordList.length)];
  }

  wordExists(word: string): boolean {
    return this.wordList.includes(word.toLowerCase().trim());
  }
}

export const wordRepository = new OfflineWordRepository();
