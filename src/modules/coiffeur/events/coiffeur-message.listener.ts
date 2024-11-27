import { Message } from 'discord.js';
import {
  WHAT,
  WHAT_ANSWER,
  WHY,
  WHY_ANWSER,
} from '@/modules/coiffeur/coiffeur-constants.js';

export async function coiffeurMessageListener(message: Message): Promise<void> {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();
  const shouldReply = Math.random() > 0.66;

  if (WHY.some((p) => content.includes(p)) && shouldReply) {
    await message.reply(
      WHY_ANWSER[Math.floor(Math.random() * WHY_ANWSER.length)],
    );
  } else if (WHAT.some((q) => content.includes(q)) && shouldReply) {
    await message.reply(
      WHAT_ANSWER[Math.floor(Math.random() * WHAT_ANSWER.length)],
    );
  }
}
