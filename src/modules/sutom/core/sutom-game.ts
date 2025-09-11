import { WordRepository } from '@/modules/sutom/core/word-repository.js';
import { EmbedBuilder } from 'discord.js';

export class SutomGame {
  word = '';
  wordHistory: string[] = [];
  wordRepository: WordRepository;

  constructor(wordRepository: WordRepository) {
    this.word = wordRepository.getRandomWord();
    console.log('[SutomGame] Word to guess: ' + this.word);
    this.wordRepository = wordRepository;
  }

  /**
   * Render the current board.
   * Rules for the visual representation:
   *  - Correct letter (good letter & good place): show the letter as a REGIONAL INDICATOR emoji (🇦 🇧 🇨 ...)
   *  - Misplaced letter: 🟧
   *  - Incorrect letter: ⬜
   *  - When no attempt yet: show first letter revealed then placeholder squares.
   * Using emojis helps keep a “monospace-ish” alignment inside a code block / embed description.
   */
  renderHistory(): string {
    return this.renderBoard();
  }

  renderBoard(): string {
    // Build rows for each guess
    const rows: string[] = [];

    if (this.wordHistory.length === 0) {
      // Initial hint row: first letter uppercase + placeholders
      rows.push(
        this.letterToEmoji(this.word[0], true) +
          ' ' +
          Array.from({ length: this.word.length - 1 })
            .map(() => '⬜')
            .join(' '),
      );
    }

    for (const guess of this.wordHistory) {
      const evaluation = this.evaluateGuess(guess);
      const tokens: string[] = [];
      for (let i = 0; i < guess.length; i++) {
        const state = evaluation[i];
        if (state === LetterState.CORRECT) {
          tokens.push(this.letterToEmoji(guess[i], true));
        } else if (state === LetterState.MISPLACED) {
          tokens.push('🟧');
        } else {
          tokens.push('⬜');
        }
      }
      rows.push(tokens.join(' '));
    }

    return rows.join('\n');
  }

  /**
   * Convert a latin letter to its regional indicator symbol (A-Z only) to display the letter.
   * If not a-z (e.g. accented letters), fallback to bold uppercase letter.
   */
  private letterToEmoji(letter: string, uppercase = false): string {
    const l = (uppercase ? letter.toUpperCase() : letter).normalize('NFD');
    const plain = l[0];
    if (/^[A-Z]$/i.test(plain)) {
      // Use Discord colon shortcode so it renders even outside code blocks
      return `:regional_indicator_${plain.toLowerCase()}:`;
    }
    return `**${plain.toUpperCase()}**`;
  }

  getRemainingAttempts(): number {
    return 6 - this.wordHistory.length;
  }

  buildEmbed(message?: string): EmbedBuilder {
    const descriptionParts: string[] = [];
    descriptionParts.push(this.renderBoard());
    descriptionParts.push('Essais: ' + String(this.wordHistory.length) + '/6');
    if (message) descriptionParts.push(message);

    return new EmbedBuilder()
      .setTitle('🎯 SUTOM')
      .setColor(0x2ecc71)
      .setDescription(descriptionParts.join('\n'))
      .setFooter({ text: 'Trouve le mot avant la 6ᵉ tentative !' })
      .setTimestamp();
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
  UNKNOWN_WORD,
  WORD_LENGTH_MISMATCH,
  WORD_REPEATED,
  WORD_SUCCESSFULLY_GUESSED,
  ATTEMPTS_EXHAUSTED,
}
