import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TextToSpeechClient, type protos } from "@google-cloud/text-to-speech";
import OpenAI from "openai";
import { env } from "~/env";
import { db } from "~/server/db";
import {
  llmConversationSchema,
  difficultySchema,
  voiceModeSchema,
  type StreamingChunk,
  deepPartialLLMConversationSchema,
  type DeepPartialLLMConversation,
} from "~/types";
import { zodResponseFormat } from "openai/helpers/zod";

const familiaritySchema = z.enum(["stranger", "casual", "close"]);

// Initialize TTS clients
const googleTts = new TextToSpeechClient({
  credentials: {
    client_email: env.GOOGLE_CLIENT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY,
  },
});

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

async function generateGoogleSpeech(
  text: string,
  role: "A" | "B",
  voiceMode: z.infer<typeof voiceModeSchema> = "different",
): Promise<Buffer> {
  const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest =
    {
      input: { text },
      voice: {
        languageCode: "ja-JP",
        name:
          voiceMode === "different"
            ? role === "A"
              ? "ja-JP-Neural2-D"
              : "ja-JP-Neural2-B"
            : "ja-JP-Neural2-B",
      },
      audioConfig: { audioEncoding: "MP3" as const },
    };

  const [response] = await googleTts.synthesizeSpeech(request);
  return Buffer.from(response.audioContent as Buffer);
}

async function generateOpenAISpeech(text: string): Promise<Buffer> {
  const mp3Response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: text,
  });

  return Buffer.from(await mp3Response.arrayBuffer());
}

export const conversationsRouter = createTRPCRouter({
  generate: publicProcedure
    .input(
      z.object({
        prompt: z.string(),
        practiceId: z.string().optional(),
        difficulty: difficultySchema,
        voiceMode: voiceModeSchema.default("different"),
        familiarity: familiaritySchema.default("casual"),
      }),
    )
    .mutation(async function* ({ input }) {
      const { prompt, practiceId, difficulty, voiceMode, familiarity } = input;

      try {
        // Get existing conversation titles if practiceId exists
        const existingTitles: string[] = ["rain", "picnic", "umbrella"];
        if (practiceId) {
          const practice = await db.practice.findUnique({
            where: { id: practiceId },
            select: { conversations: { select: { title: true } } },
          });
          if (practice) {
            existingTitles.push(
              ...practice.conversations
                .map((conv) => conv.title)
                .filter((title): title is string => title !== null),
            );
          }
        }

        const stream = openai.beta.chat.completions.stream({
          model: env.OPENAI_MODEL,
          temperature: 0.7,
          top_p: 1,
          presence_penalty: 0.6,
          frequency_penalty: 0,
          max_tokens: 16384,
          messages: [
            {
              role: "system",
              content:
                "You are a humorous and lively Japanese language teacher. You excel at creating fun and practical teaching materials but also keep the conversation natural and lively.",
            },
            {
              role: "user",
              content: `Generate a Japanese conversation with these specifications:

**Conversation Structure:**
- Length: 8-10 exchanges
- For each sentence, provide:
  1. Original Japanese text (use kanji without furigana)
  2. Hiragana pronunciation
  3. Translation in Traditional Chinese (zh-TW), Simplified Chinese is prohibited
  4. Detailed grammar explanation in Traditional Chinese (zh-TW), Simplified Chinese is prohibited
- Generate a short title that summarizes the theme or content of the conversation.

**Participants:**
- ${
                voiceMode === "different"
                  ? "The first person is male, the second person is female"
                  : "Both are female"
              }
- Age: 20s
- Relationship: ${
                familiarity === "stranger"
                  ? "people who have never met before, maintain formal politeness"
                  : familiarity === "casual"
                    ? "people who have medium familiarity, keep it casual while maintaining appropriate politeness"
                    : "close friends who are very familiar with each other, use casual and friendly language"
              }

**Content Requirements:**
- Difficulty level: ${difficulty}
- Include authentic Japanese cultural elements
- Reflect real-life situations, not textbook examples
- Use natural, conversational Japanese. Use natural pauses and interjections
- Include varied sentence structures
- Avoid topics: ${existingTitles.map((title) => `"${title}"`).join(", ")}

**Conversation Topic:**
${prompt}`,
            },
          ],
          response_format: zodResponseFormat(
            llmConversationSchema,
            "conversation",
          ),
        });

        type StreamEvent<T> =
          | { type: "data"; data: T }
          | { type: "end" }
          | { type: "skip" };

        while (true) {
          const event = await new Promise<
            StreamEvent<DeepPartialLLMConversation>
          >((resolve) => {
            stream.once("content.delta", ({ parsed }) => {
              if (parsed) {
                const { success, data, error } =
                  deepPartialLLMConversationSchema.safeParse(parsed);
                if (success) {
                  resolve({ type: "data", data });
                } else {
                  resolve({ type: "skip" });
                  console.error(error, parsed);
                }
              }
            });
            stream.once("end", () => {
              resolve({ type: "end" });
            });
          });

          if (event.type === "end") {
            break;
          } else if (event.type === "data") {
            yield {
              type: "llm_progress",
              data: event.data,
            } satisfies StreamingChunk;
          }
        }

        // Get the final completion
        const finalCompletion = await stream.finalChatCompletion();
        const parsedResponse = finalCompletion.choices[0]?.message.parsed;

        if (parsedResponse) {
          const { title, sentences } = parsedResponse;

          // Create or get practice
          let practice;
          if (practiceId) {
            practice = await db.practice.update({
              where: { id: practiceId },
              data: {
                prompt,
              },
            });
            if (!practice) {
              throw new Error("Practice not found");
            }
          } else {
            practice = await db.practice.create({
              data: {
                prompt,
                title: prompt,
              },
            });
          }

          // Generate audio for each line using the selected provider
          const conversationsWithAudio = [];
          for (const [index, conv] of sentences.entries()) {
            const role = index % 2 === 0 ? "A" : "B";
            const audioContent = await (env.TTS_PROVIDER === "google"
              ? generateGoogleSpeech(conv.hiragana, role, voiceMode)
              : generateOpenAISpeech(conv.hiragana));

            console.log(`Processing TTS: ${index} - ${conv.hiragana}`);

            if (!audioContent) {
              throw new Error("Failed to generate audio");
            }

            const audioUrl = `data:audio/mp3;base64,${audioContent.toString("base64")}`;
            const sentenceWithAudio = { ...conv, audioUrl };
            conversationsWithAudio.push(sentenceWithAudio);
          }

          // Create new conversation
          const conversation = await db.conversation.create({
            data: {
              title,
              content: conversationsWithAudio,
              practiceId: practice.id,
              difficulty,
              voiceMode,
              familiarity,
            },
          });

          yield {
            type: "complete",
            data: conversation,
          } satisfies StreamingChunk;
        }
      } catch (error) {
        console.error("Error in generate:", error);
        throw error;
      }
    }),

  getPractices: publicProcedure.query(async () => {
    return db.practice.findMany({
      include: {
        conversations: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  getPractice: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const practice = await db.practice.findUnique({
        where: { id: input.id },
        include: {
          conversations: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!practice) {
        throw new Error("Practice not found");
      }

      return practice;
    }),

  getConversation: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const conversation = await db.conversation.findUnique({
        where: { id: input.id },
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      return conversation;
    }),

  deletePractice: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.practice.delete({
        where: { id: input.id },
      });
    }),

  updatePracticeTitle: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.practice.update({
        where: { id: input.id },
        data: { title: input.title },
      });
    }),

  deleteConversation: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.conversation.delete({
        where: { id: input.id },
      });
    }),
});
