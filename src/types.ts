import { type Prisma } from "@prisma/client";
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

export const deepPartialLLMConversationSchema =
  llmConversationSchema.deepPartial();

export const difficultySchema = z.enum([
  "JLPT N4-N5",
  "JLPT N3",
  "JLPT N2",
  "JLPT N1",
]);

export const voiceModeSchema = z.enum(["different", "same"]);

export const familiaritySchema = z.enum(["stranger", "casual", "close"]);

type LLMConversation = z.infer<typeof llmConversationSchema>;

export type ConversationSentence = Partial<
  LLMConversation["sentences"][number]
> & {
  audioUrl?: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PrismaJson {
    type ConversationContentType = ConversationSentence[];
  }
}

export type DeepPartialLLMConversation = z.infer<
  typeof deepPartialLLMConversationSchema
>;

export type StreamingChunk =
  | {
      type: "llm_progress";
      data: DeepPartialLLMConversation;
    }
  | {
      type: "complete";
      data: Prisma.ConversationGetPayload<null>;
    };
