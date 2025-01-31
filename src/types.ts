import { z } from "zod";

export const llmConversationSchema = z.object({
  title: z.string(),
  sentences: z.array(
    z.object({
      role: z.enum(["A", "B"]),
      text: z.string(),
      hiragana: z.string(),
      translation: z.string(),
      grammarExplanation: z.string(),
    }),
  ),
});

export const difficultySchema = z.enum([
  "JLPT N5",
  "JLPT N5-N4",
  "JLPT N4",
  "JLPT N3",
  "JLPT N2",
  "JLPT N1",
]);

export const voiceModeSchema = z.enum(["different", "same"]);

type LLMConversation = z.infer<typeof llmConversationSchema>;

type ConversationSentence = LLMConversation["sentences"][number] & {
  audioUrl?: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PrismaJson {
    type ConversationContentType = ConversationSentence[];
  }
}
