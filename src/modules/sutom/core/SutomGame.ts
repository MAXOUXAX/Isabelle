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
      const letters = this.evaluateGuess(word);

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

  addWord(word: string): AttemptOutcome {
    const error = this.checkError(word);

    if (error) {
      return error;
    }

    this.wordHistory.push(word);
    if (this.wordHistory.length === 6) {
      return AttemptOutcome.GAME_FINISHED;
    }

    const letters = this.evaluateGuess(word);
    if (letters.every((letter) => letter === LetterState.CORRECT)) {
      return AttemptOutcome.CORRECT_WORD_FOUND;
    }

    return AttemptOutcome.VALID_WORD;
  }

  removeLastWord(): void {
    this.wordHistory.pop();
  }

  checkError(word: string): AttemptOutcome {
    if (this.wordHistory.length >= 6) {
      return AttemptOutcome.GAME_FINISHED;
    }

    if (word.length !== this.word.length) {
      return AttemptOutcome.WORD_LENGHT_NOT_CORRECT;
    }

    if (this.wordHistory.includes(word)) {
      return AttemptOutcome.WORD_ALREADY_TRIED;
    }

    if (!this.wordRepository.wordExists(word)) {
      return AttemptOutcome.WORD_UNKNOWED;
    }

    return AttemptOutcome.VALID_WORD;
  }

  evaluateGuess(word: string): LetterState[] {
    const letterStates = [];
    const lettersOccurence = new Map<string, number>();

    word.split('').forEach((letterStates) => {
      const numberOfOccurence = lettersOccurence.get(letterStates);
      if (numberOfOccurence != null) {
        lettersOccurence.set(letterStates, numberOfOccurence + 1);
      } else {
        lettersOccurence.set(letterStates, 1);
      }
    });

    for (let i = 0; i < this.word.length; i++) {
      if (word[i] === this.word[i]) {
        letterStates.push(LetterState.CORRECT);
        lettersOccurence.set(word[i], (lettersOccurence.get(word[i]) ?? 0) - 1);
      } else {
        if (
          lettersOccurence.has(this.word[i]) &&
          (lettersOccurence.get(this.word[i]) ?? 0) > 0
        ) {
          letterStates.push(LetterState.MISPLACED);
          lettersOccurence.set(
            this.word[i],
            (lettersOccurence.get(this.word[i]) ?? 0) - 1,
          );
        } else {
          letterStates.push(LetterState.INCORRECT);
        }
      }
    }

    return letterStates;
  }
}

export enum LetterState {
  CORRECT,
  INCORRECT,
  MISPLACED,
}

export enum AttemptOutcome {
  VALID_WORD,
  WORD_UNKNOWED,
  WORD_LENGHT_NOT_CORRECT,
  WORD_ALREADY_TRIED,
  GAME_FINISHED,
  CORRECT_WORD_FOUND,
}
