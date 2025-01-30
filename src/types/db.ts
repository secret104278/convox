export type Conversation = {
  role: "A" | "B";
  text: string;
  hiragana: string;
  translation: string;
  audioUrl?: string;
};

