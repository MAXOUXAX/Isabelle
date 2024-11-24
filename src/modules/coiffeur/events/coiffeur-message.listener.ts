import { Message } from 'discord.js';

export async function coiffeurMessageListener(message: Message): Promise<void> {
  if (message.author.bot) return;

  const pourquoi = [
    'pourquoi',
    'pourkoi',
    'pourkwa',
    'pour quoi',
    'pour koi',
    'pour kwa',
  ];
  const quoi = ['quoi', 'koi', 'kwa'];

  const quoiResponse = [
    'feur',
    'feur!',
    'feur.',
    'feur?',
    'feur...',
    'feur!',
    'coubeh!',
    'coubeh',
    'coubeh!',
    'coubeh.',
    'coubeh?',
    'coubeh...',
  ];
  const pourquoiResponse = [
    'Pour feur!',
    'Pour feur.',
    'Pour feur?',
    'Pour feur...',
    'Parce que feur!',
    'Parce que feur.',
    'Parce que feur?',
    'Parce que feur...',
  ];

  const content = message.content.toLowerCase();

  if (pourquoi.some((p) => content.includes(p))) {
    await message.reply(
      pourquoiResponse[Math.floor(Math.random() * pourquoiResponse.length)],
    );
  } else if (quoi.some((q) => content.includes(q))) {
    await message.reply(
      quoiResponse[Math.floor(Math.random() * quoiResponse.length)],
    );
  }
}
