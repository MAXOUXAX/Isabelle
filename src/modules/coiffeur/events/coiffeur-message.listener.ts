import { Message } from 'discord.js';
import { COIFFEUR_DICTIONARY } from '@/modules/coiffeur/coiffeur.constants.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function shouldReply(message: string): boolean {
  return Math.random() > 0.66; //Répond une fois sur 3 (en théorie)
}

export async function coiffeurMessageListener(message: Message): Promise<void> {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  //Isabelle répond ?
  if (shouldReply(content)) {
    const matchedEntry = Object.entries(COIFFEUR_DICTIONARY).find(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_, { trigger }]) => trigger.some((t) => content.includes(t)),
    );

    if (matchedEntry) {
      const { answer } = matchedEntry[1];
      const randomAnswer = answer[Math.floor(Math.random() * answer.length)];
      await message.reply(randomAnswer);
    }
  }
}
