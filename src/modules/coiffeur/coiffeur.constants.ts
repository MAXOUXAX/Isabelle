import { MessageDictionnary } from '@/utils/dictionnary.js';

const WHY = [
  'pourquoi',
  'pourkoi',
  'pourkwa',
  'pour quoi',
  'pour koi',
  'pour kwa',
];

const WHAT = ['quoi', 'koi', 'kwa'];

const WHAT_ANSWER = [
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

const WHY_ANWSER = [
  'Pour feur!',
  'Pour feur.',
  'Pour feur?',
  'Pour feur...',
  'Parce que feur!',
  'Parce que feur.',
  'Parce que feur?',
  'Parce que feur...',
];

export const COIFFEUR_DICTIONARY: MessageDictionnary = {
  why: {
    trigger: WHY,
    answer: WHY_ANWSER,
  },
  what: {
    trigger: WHAT,
    answer: WHAT_ANSWER,
  },
};
