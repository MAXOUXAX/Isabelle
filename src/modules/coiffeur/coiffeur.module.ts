import { client } from '@/index.js';
import { IsabelleModule } from '@/modules/bot-module.js';
import { Events } from 'discord.js';
import { coiffeurMessageListener } from './events/coiffeur-message.listener.js';

export class Coiffeur extends IsabelleModule {
  readonly name = 'Coiffeur';

  init(): void {
    this.registerCoiffeurEvent();
  }

  registerCoiffeurEvent() {
    client.on(Events.MessageCreate, (...args) => {
      {
        void coiffeurMessageListener(...args);
      }
    });
  }
}
