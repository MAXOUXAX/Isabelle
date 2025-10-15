import * as fs from 'fs';
import * as path from 'path';

const config = {
  lexiquePath: './Lexique383/Lexique383.tsv',
  outputDir: '../public/resources/sutom/',
  wordLengths: [4, 5, 6, 7, 8, 9, 10],
  // Set a minimum usage frequency for a word to be included in the solutions list.
  // A higher value means a shorter, more common-word-focused list.
  minFrequencyForSolution: 1.0,
};

// Interface for a parsed record from the database
interface LexiqueRecord {
  ortho: string;
  cgram: string;
  infover: string;
  freqfilms2: number;
}

/**
 * Main function to generate the word list text files.
 */
function generateWordLists() {
  console.log('🚀 Starting word list generation...');

  try {
    const allRecords = parseLexique();
    if (allRecords.length === 0) return;

    fs.mkdirSync(config.outputDir, { recursive: true });

    const allSolutionWords: string[] = [];
    const allGuessWords: string[] = [];

    // Process each word length
    for (const length of config.wordLengths) {
      console.log(`\nProcessing words of length ${String(length)}...`);

      const validWords = allRecords
        .filter((record) => record.ortho.length === length)
        .sort((a, b) => b.freqfilms2 - a.freqfilms2);

      const uniqueRecords = validWords.filter(
        (record, index, self) =>
          index === self.findIndex((r) => r.ortho === record.ortho),
      );

      const solutionRecords = uniqueRecords.filter(
        (record) => record.freqfilms2 >= config.minFrequencyForSolution,
      );

      if (solutionRecords.length > 0) {
        const topFreq = solutionRecords[0].freqfilms2.toFixed(2);
        const bottomFreq =
          solutionRecords[solutionRecords.length - 1].freqfilms2.toFixed(2);
        console.log(
          `  -> Frequencies for solutions range from ${topFreq} to ${bottomFreq}.`,
        );

        console.log('     Least frequent words added to solutions:');
        const leastFrequent = solutionRecords.slice(-5).reverse();
        for (const record of leastFrequent) {
          console.log(
            `       - ${record.ortho} (freq: ${record.freqfilms2.toFixed(2)}, type: ${record.cgram})`,
          );
        }
      }

      const solutionWords = solutionRecords.map((r) => r.ortho);
      const guessWords = uniqueRecords.map((r) => r.ortho);

      if (solutionWords.length > 0) {
        allSolutionWords.push(...solutionWords);
        allGuessWords.push(...guessWords);
        console.log(
          ` -> Found ${String(solutionWords.length)} solution words (freq >= ${String(config.minFrequencyForSolution)}).`,
        );
        console.log(
          ` -> Found ${String(guessWords.length)} valid guess words.`,
        );
      } else {
        console.log(
          ` -> No words found with frequency >= ${String(config.minFrequencyForSolution)}.`,
        );
      }
    }

    // Sort alphabetically and write to files
    allSolutionWords.sort();
    allGuessWords.sort();

    writeWordsToFile('solutions.txt', allSolutionWords);
    writeWordsToFile('guesses.txt', allGuessWords);

    console.log(
      `\n📊 Total: ${String(allSolutionWords.length)} solution words, ${String(allGuessWords.length)} guess words`,
    );
    console.log('\n🎉 Word lists generated successfully!');
  } catch (error) {
    console.error('❌ An error occurred:', (error as Error).message);
  }
}

/**
 * Parses the Lexique383.tsv file and applies grammatical filters.
 */
function parseLexique(): LexiqueRecord[] {
  console.log('Reading and parsing Lexique383 database...');
  if (!fs.existsSync(config.lexiquePath)) {
    throw new Error(
      `Database file not found at ${config.lexiquePath}. Please download it.`,
    );
  }

  const fileContent = fs.readFileSync(config.lexiquePath, 'utf-8');
  const lines = fileContent.split('\n');
  const headers = lines.shift()?.split('\t') ?? [];

  const orthoIndex = headers.indexOf('ortho');
  const cgramIndex = headers.indexOf('cgram');
  const infoverIndex = headers.indexOf('infover');
  const freqfilms2Index = headers.indexOf('freqfilms2');

  const records: LexiqueRecord[] = [];
  const alphaRegex = /^[a-z]+$/;

  for (const line of lines) {
    const data = line.split('\t');
    const word = data[orthoIndex];

    if (!word || !alphaRegex.test(word)) continue;

    const cgram = data[cgramIndex];
    const isVerb = cgram === 'VER';
    const isNoun = cgram === 'NOM';
    const isAdj = cgram === 'ADJ';

    if (isNoun || isAdj || (isVerb && data[infoverIndex].includes('inf'))) {
      records.push({
        ortho: word,
        cgram: cgram,
        infover: data[infoverIndex],
        freqfilms2: parseFloat(data[freqfilms2Index]?.replace(',', '.')) || 0,
      });
    }
  }
  console.log(
    `Found ${String(records.length)} potentially valid words in the database.`,
  );
  return records;
}

/**
 * Writes a list of words to a text file, one word per line.
 * @param filename - The name of the output file.
 * @param words - The array of words to write.
 */
function writeWordsToFile(filename: string, words: string[]) {
  const filePath = path.join(config.outputDir, filename);
  const content = words.join('\n') + '\n';

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Successfully generated ${filePath}`);
}

// Run the generation script
generateWordLists();
