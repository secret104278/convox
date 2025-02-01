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
} from "~/types";
import { zodResponseFormat } from "openai/helpers/zod";
import { chatCompletionStreamToGenerator } from "./utils";

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

      // Get existing conversation titles and content if practiceId exists
      const existingTitles: string[] = ["rain", "picnic", "umbrella"];
      let previousConversations = "";
      if (practiceId) {
        const [practiceWithLatestConversations, practiceWithAllConversations] =
          await Promise.all([
            db.practice.findUnique({
              where: { id: practiceId },
              select: {
                conversations: {
                  select: {
                    content: true,
                  },
                  take: 3, // Limit to last 3 conversations to avoid token limits
                  orderBy: { createdAt: "desc" },
                },
              },
            }),
            db.practice.findUnique({
              where: { id: practiceId },
              select: {
                conversations: {
                  select: {
                    title: true,
                  },
                },
              },
            }),
          ]);

        if (practiceWithLatestConversations) {
          // Format previous conversations for the prompt
          previousConversations = practiceWithLatestConversations.conversations
            .map((conversation) =>
              conversation.content.map((sentence) => sentence.text).join("\n"),
            )
            .join("\n---\n");
        }

        if (practiceWithAllConversations) {
          existingTitles.push(
            ...practiceWithAllConversations.conversations
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
        frequency_penalty: 0.1,
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
- Create unique scenarios and avoid common conversation patterns
- Use diverse vocabulary appropriate for the difficulty level
- If possible, slightly include some unexpected elements or creative twists while staying natural
- Avoid topics like ${existingTitles.join(", ")}

**Conversation Topic:**
${prompt}`,
          },
          ...(previousConversations
            ? [
                {
                  role: "user",
                  content: `Here are some previous conversations generated for this topic. Please create a new conversation that uses different vocabulary and scenarios:\n\n${previousConversations}`,
                } as const,
              ]
            : []),
        ],
        response_format: zodResponseFormat(
          llmConversationSchema,
          "conversation",
        ),
      });

      for await (const chunk of chatCompletionStreamToGenerator(stream)) {
        const { success, data } =
          deepPartialLLMConversationSchema.safeParse(chunk);
        if (success) {
          yield {
            type: "llm_progress",
            data: data,
          } satisfies StreamingChunk;
        }
      }

      // Get the final completion
      const finalCompletion = await stream.finalChatCompletion();
      const parsedResponse = finalCompletion.choices[0]?.message.parsed;

      if (parsedResponse) {
        const { title, sentences } = parsedResponse;

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

        // Create or get practice
        const practice = await db.practice.upsert({
          select: {
            id: true,
          },
          where: {
            id: practiceId ?? "",
          },
          create: {
            prompt,
            title: prompt,
          },
          update: {
            prompt,
          },
        });

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
