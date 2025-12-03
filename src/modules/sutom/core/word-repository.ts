import { resolveResourcePath } from '@/utils/resources.js';
import * as fs from 'fs';

export interface WordRepository {
  getRandomWord(): string;
  getDailyWord(): string;
  wordExists(word: string): boolean;
}

class OfflineWordRepository implements WordRepository {
  private solutionsList: string[] = [];
  private guessesList: string[] = [];

  constructor() {
    // Load solutions list (words that can be chosen as the answer)
    const solutionsFile = resolveResourcePath('sutom', 'solutions.txt');
    const solutionsContent = fs.readFileSync(solutionsFile, 'utf-8');
    this.solutionsList = solutionsContent
      .split('\n')
      .filter((word) => word.trim() !== '')
      .map((word) => word.trim().toLowerCase());

    // Load guesses list (words that are valid guesses)
    const guessesFile = resolveResourcePath('sutom', 'guesses.txt');
    const guessesContent = fs.readFileSync(guessesFile, 'utf-8');
    this.guessesList = guessesContent
      .split('\n')
      .filter((word) => word.trim() !== '')
      .map((word) => word.trim().toLowerCase());
  }

  getRandomWord(): string {
    return this.solutionsList[
      Math.floor(Math.random() * this.solutionsList.length)
    ];
  }

  /**
   * Returns a deterministic word based on the current date.
   * The same word is returned for all users on the same day.
   */
  getDailyWord(): string {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];

    // Simple hash function to convert date string to a deterministic index
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      const char = dateString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Use absolute value and modulo to get a valid index
    const index = Math.abs(hash) % this.solutionsList.length;
    return this.solutionsList[index];
  }

  wordExists(word: string): boolean {
    const normalizedWord = word.toLowerCase().trim();
    return this.guessesList.includes(normalizedWord);
  }
}

export const wordRepository: WordRepository = new OfflineWordRepository();
