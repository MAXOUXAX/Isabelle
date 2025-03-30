//Type générique représentant un dictionnaire de trigger / answer dans les messages

export type MessageDictionnary = Record<
  string,
  {
    trigger: string[];
    answer: string[];
  }
>;
