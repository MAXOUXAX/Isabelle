import { Message } from 'discord.js';
import { COIFFEUR_DICTIONARY } from '@/modules/coiffeur/coiffeur.constants.js';

function shouldReply(): boolean {
  return Math.random() > 0.66; //Répond une fois sur 3 (en théorie)
}

export async function coiffeurMessageListener(message: Message): Promise<void> {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  //Isabelle répond ?
  if (shouldReply()) {
    //On regarde si le message contient un trigger
    for (const key in COIFFEUR_DICTIONARY) {
      const { trigger, answer } = COIFFEUR_DICTIONARY[key];

      if (trigger.some((t) => content.includes(t))) {
        // si oui, Isabelle répond avec une réponse aléatoire parmi celle disponibles dans le dico
        const randomAnswer = answer[Math.floor(Math.random() * answer.length)];
        await message.reply(randomAnswer);
        return;
      }
    }
  }
}
