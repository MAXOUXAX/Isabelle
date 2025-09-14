import { resolveResourcePath } from '@/utils/resources.js';
import * as fs from 'fs';

export interface WordRepository {
  getRandomWord(): string;
  wordExists(word: string): boolean;
}

class OfflineWordRepository implements WordRepository {
  wordList: string[] = [];
  constructor() {
    const wordsFile = resolveResourcePath('sutom', 'mots.filtered.txt');
    const fileContent = fs.readFileSync(wordsFile, 'utf-8');
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

export const wordRepository: WordRepository = new OfflineWordRepository();
