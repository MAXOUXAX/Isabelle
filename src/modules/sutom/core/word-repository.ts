import { resolveResourcePath } from '@/utils/resources.js';
import * as fs from 'fs';

export interface WordRepository {
  getRandomWord(): string;
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

  wordExists(word: string): boolean {
    const normalizedWord = word.toLowerCase().trim();
    return this.guessesList.includes(normalizedWord);
  }
}

export const wordRepository: WordRepository = new OfflineWordRepository();
