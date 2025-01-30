export type Conversation = {
  role: "A" | "B";
  text: string;
  hiragana: string;
  translation: string;
  audioUrl?: string;
};

export type ConversationSession = {
  id: string;
  prompt: string;
  createdAt: Date;
  updatedAt: Date;
  conversations: Conversation[];
}; 
