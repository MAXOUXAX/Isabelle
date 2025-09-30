import { renderSutomBoardImage } from '@/modules/sutom/canvas/sutom-board-image.js';
import { WordRepository } from '@/modules/sutom/core/word-repository.js';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';

export class SutomGame {
  word = '';
  wordHistory: string[] = [];
  wordRepository: WordRepository;
  isDailyWord: boolean;

  constructor(
    wordRepository: WordRepository,
    specificWord?: string,
    isDailyWord = false,
  ) {
    this.word = specificWord ?? wordRepository.getRandomWord();
    console.log('[SutomGame] Word to guess: ' + this.word);
    this.wordRepository = wordRepository;
    this.isDailyWord = isDailyWord;
  }

  getRemainingAttempts(): number {
    return 6 - this.wordHistory.length;
  }

  /**
   * Build an embed + attachment pair using the canvas renderer instead of the legacy text board.
   * Consumers can pass the returned embed & attachment directly to an interaction reply.
   */
  buildBoard(message?: string): {
    embed: EmbedBuilder;
    attachment: AttachmentBuilder;
  } {
    const attachment = renderSutomBoardImage(this);

    const descriptionParts: string[] = [];
    descriptionParts.push('Essais: ' + String(this.wordHistory.length) + '/6');
    if (message) descriptionParts.push(message);

    const embed = new EmbedBuilder()
      .setTitle('🎯 SUTOM')
      .setColor(0x2ecc71)
      .setDescription(descriptionParts.join('\n'))
      .setFooter({ text: 'Trouve le mot avant la 6ᵉ tentative !' })
      .setImage('attachment://sutom-board.png')
      .setTimestamp();

    return { embed, attachment };
  }

  addWord(word: string): AttemptOutcome {
    const candidate = word.trim().toLowerCase();

    const error = this.checkError(candidate);
    if (error !== AttemptOutcome.VALID_WORD) {
      return error;
    }

    const letters = this.evaluateGuess(candidate);

    this.wordHistory.push(candidate);

    if (letters.every((l) => l === LetterState.CORRECT)) {
      return AttemptOutcome.WORD_SUCCESSFULLY_GUESSED;
    }

    if (this.wordHistory.length == 6) {
      return AttemptOutcome.ATTEMPTS_EXHAUSTED;
    }

    return AttemptOutcome.VALID_WORD;
  }

  checkError(word: string): AttemptOutcome {
    if (word.length !== this.word.length) {
      return AttemptOutcome.WORD_LENGTH_MISMATCH;
    }

    if (this.wordHistory.includes(word)) {
      return AttemptOutcome.WORD_REPEATED;
    }

    if (!this.wordRepository.wordExists(word)) {
      return AttemptOutcome.UNKNOWN_WORD;
    }

    return AttemptOutcome.VALID_WORD;
  }

  evaluateGuess(word: string): LetterState[] {
    const letterStates: (LetterState | null)[] = [];
    const targetLetterCounts = new Map<string, number>();

    // Count letter occurrences in the target word
    this.word.split('').forEach((letter) => {
      const count = targetLetterCounts.get(letter);
      if (count != null) {
        targetLetterCounts.set(letter, count + 1);
      } else {
        targetLetterCounts.set(letter, 1);
      }
    });

    // First pass: mark correct letters and decrement their counts
    for (let i = 0; i < this.word.length; i++) {
      if (word[i] === this.word[i]) {
        letterStates.push(LetterState.CORRECT);
        const currentCount = targetLetterCounts.get(word[i]) ?? 0;
        targetLetterCounts.set(word[i], currentCount - 1);
      } else {
        letterStates.push(null); // Placeholder for non-matching letters
      }
    }

    // Second pass: mark misplaced and incorrect letters
    for (let i = 0; i < this.word.length; i++) {
      if (letterStates[i] === null) {
        const guessedLetter = word[i];
        const remainingCount = targetLetterCounts.get(guessedLetter) ?? 0;

        if (remainingCount > 0) {
          letterStates[i] = LetterState.MISPLACED;
          targetLetterCounts.set(guessedLetter, remainingCount - 1);
        } else {
          letterStates[i] = LetterState.INCORRECT;
        }
      }
    }

    return letterStates as LetterState[];
  }
}

export enum LetterState {
  CORRECT,
  INCORRECT,
  MISPLACED,
}

export enum AttemptOutcome {
  VALID_WORD,
  UNKNOWN_WORD,
  WORD_LENGTH_MISMATCH,
  WORD_REPEATED,
  WORD_SUCCESSFULLY_GUESSED,
  ATTEMPTS_EXHAUSTED,
}
