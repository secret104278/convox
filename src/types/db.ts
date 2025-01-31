import { z } from "zod";

export const llmConversationSchema = z.object({
  title: z.string(),
  sentences: z.array(
    z.object({
      role: z.enum(["A", "B"]),
      text: z.string(),
      hiragana: z.string(),
      translation: z.string(),
    }),
  ),
});

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
