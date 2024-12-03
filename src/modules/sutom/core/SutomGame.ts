import { WordRepository } from '@/modules/sutom/core/wordRepository.js';

export class SutomGame {
  word = '';
  wordHistory: string[] = [];
  wordRepository: WordRepository;

  constructor(wordRepository: WordRepository) {
    this.word = wordRepository.getRandomWord();
    console.log('[SutomGame] Word to guess: ' + this.word);
    this.wordRepository = wordRepository;
  }

  renderHistory(): string {
    if (this.wordHistory.length === 0) {
      return (
        this.word[0].toUpperCase() + '⬜'.repeat(this.word.length - 1) + '\n'
      );
    }

    let final = '';

    for (const word of this.wordHistory) {
      const letters = this.detectWordCorrectness(word);

      final += word.split('').join(' ').toUpperCase();
      final += '\n';

      for (const letter of letters) {
        if (letter === LetterState.CORRECT) {
          final += '🟩';
        } else if (letter === LetterState.MISPLACED) {
          final += '🟧';
        } else {
          final += '⬜';
        }
      }
      final += '\n';
    }

    return final;
  }

  addWord(word: string): WordState {
    const error = this.checkError(word);
    console.log(error);

    if (error) {
      return error;
    }

    this.wordHistory.push(word);
    if (this.wordHistory.length === 6) {
      return WordState.GAME_FINISHED;
    }

    const letters = this.detectWordCorrectness(word);
    if (letters.every((letter) => letter === LetterState.CORRECT)) {
      return WordState.GAME_WIN;
    }

    return WordState.NO_ERROR;
  }

  removeLastWord(): void {
    this.wordHistory.pop();
  }

  checkError(word: string): WordState {
    if (this.wordHistory.length >= 6) {
      return WordState.GAME_FINISHED;
    }

    if (word.length !== this.word.length) {
      return WordState.LENGHT_NOT_CORRECT;
    }

    if (this.wordHistory.includes(word)) {
      return WordState.ALREADY_TRIED;
    }

    if (!this.wordRepository.wordExists(word)) {
      return WordState.NOT_IN_DICTIONARY;
    }

    return WordState.NO_ERROR;
  }

  detectWordCorrectness(word: string): LetterState[] {
    const letter = [];
    const numberOccurence = new Map<string, number>();

    word.split('').forEach((letter) => {
      const numberOfOccurence = numberOccurence.get(letter);
      if (numberOfOccurence != null) {
        numberOccurence.set(letter, numberOfOccurence + 1);
      } else {
        numberOccurence.set(letter, 1);
      }
    });

    for (let i = 0; i < this.word.length; i++) {
      if (word[i] === this.word[i]) {
        letter.push(LetterState.CORRECT);
        numberOccurence.set(word[i], (numberOccurence.get(word[i]) ?? 0) - 1);
      } else {
        if (
          numberOccurence.has(this.word[i]) &&
          (numberOccurence.get(this.word[i]) ?? 0) > 0
        ) {
          letter.push(LetterState.MISPLACED);
          numberOccurence.set(
            this.word[i],
            (numberOccurence.get(this.word[i]) ?? 0) - 1,
          );
        } else {
          letter.push(LetterState.INCORRECT);
        }
      }
    }

    return letter;
  }
}

export enum LetterState {
  CORRECT,
  INCORRECT,
  MISPLACED,
}

export enum WordState {
  NO_ERROR,
  NOT_IN_DICTIONARY,
  LENGHT_NOT_CORRECT,
  ALREADY_TRIED,
  GAME_FINISHED,
  GAME_WIN,
}
