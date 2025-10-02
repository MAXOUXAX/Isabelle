import { resolveResourcePath } from '@/utils/resources.js';
import * as fs from 'fs';

export interface WordRepository {
  getRandomWord(): string;
  getDailyWord(): string;
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

  getDailyWord(): string {
    // Generate a deterministic word based on the current date
    const today = new Date();
    const year = today.getFullYear().toString();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Simple hash function to convert date string to a number
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      const char = dateString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Use absolute value and modulo to get a valid index
    const index = Math.abs(hash) % this.wordList.length;
    return this.wordList[index];
  }

  wordExists(word: string): boolean {
    return this.wordList.includes(word.toLowerCase().trim());
  }
}

export const wordRepository: WordRepository = new OfflineWordRepository();
