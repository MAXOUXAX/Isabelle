import { renderSutomBoardImage } from '@/modules/sutom/canvas/sutom-board-image.js';
import { WordRepository } from '@/modules/sutom/core/word-repository.js';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';

export class SutomGame {
  word = '';
  wordHistory: string[] = [];
  wordRepository: WordRepository;

  constructor(wordRepository: WordRepository) {
    this.word = wordRepository.getRandomWord();
    console.log('[SutomGame] Word to guess: ' + this.word);
    this.wordRepository = wordRepository;
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
      .setImage('attachment://sutom-board.jpg')
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
