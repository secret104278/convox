import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { TextToSpeechClient, type protos } from "@google-cloud/text-to-speech";
import OpenAI from "openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { env } from "~/env";
import { db } from "~/server/db";
import {
  llmConversationSchema,
  difficultySchema,
  voiceModeSchema,
} from "~/types";

const outputParser = StructuredOutputParser.fromZodSchema(
  llmConversationSchema,
);

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
    .mutation(async ({ input }) => {
      const { prompt, practiceId, difficulty, voiceMode, familiarity } = input;

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
              .filter((title) => title !== null),
          );
        }
      }

      // Initialize the appropriate chat model based on provider
      let model;
      switch (env.LLM_PROVIDER) {
        case "deepseek":
          model = new ChatDeepSeek({
            modelName: "deepseek-chat",
            temperature: 0.7,
            apiKey: env.DEEPSEEK_API_KEY,
          });
          break;
        case "ollama":
          model = new ChatOllama({
            baseUrl: env.OLLAMA_BASE_URL,
            model: env.OLLAMA_MODEL,
            temperature: 0.7,
          });
          break;
        case "nvidia":
          model = new ChatOpenAI({
            apiKey:
              "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",
            configuration: {
              baseURL: "https://integrate.api.nvidia.com/v1",
            },
            model: "deepseek-ai/deepseek-r1",
            temperature: 1,
            topP: 1,
            presencePenalty: 0.6,
            frequencyPenalty: 0,
            maxTokens: 4096,
            cache: false,
          });
          break;
        default: // openai
          model = new ChatOpenAI({
            modelName: env.OPENAI_MODEL,
            temperature: 1,
            topP: 1,
            presencePenalty: 0.6,
            frequencyPenalty: 0,
            maxTokens: 4096,
            cache: false,
            openAIApiKey: env.OPENAI_API_KEY,
          });
      }

      model = model.withStructuredOutput(outputParser, {
        strict: true,
      });

      const response = await model.invoke([
        new SystemMessage(
          `You are a humorous and lively Japanese language teacher. You excel at creating fun and practical teaching materials but also keep the conversation natural and lively.`,
        ),
        new HumanMessage(
          `Please generate a Japanese conversation based on the following topic: ${prompt}

Create a natural and lively daily conversation with 8-10 exchanges. For each sentence, please provide:
1. Original Japanese text (use kanji without including furigana)
2. Hiragana pronunciation
3. Translation. Please use Traditional Chinese (zh-TW), Simplified Chinese is prohibited
4. Complete explanation of the particle, verb conjugation, and other grammar points in the sentence, except for "${prompt}" if any. Please use Traditional Chinese (zh-TW), Simplified Chinese is prohibited

Also, generate a short title that summarizes the theme or content of the conversation.

Requirements:
- Generate a conversation at ${difficulty} level
- Avoid topics like ${existingTitles.map((title) => `"${title}"`).join(", ")}
- 
- ${
            voiceMode === "different"
              ? "The first person is male, the second person is female"
              : "Both are female"
          }, both are in their 20s
- Make the conversation between ${
            familiarity === "stranger"
              ? "people who have never met before, maintain formal politeness"
              : familiarity === "casual"
                ? "people who have medium familiarity, keep it casual while maintaining appropriate politeness"
                : "close friends who are very familiar with each other, use casual and friendly language"
          }
- Ensure the content reflects real-life situations instead of something in a textbook, and include some authentic Japanese cultural elements.`,
        ),
      ]);

      const { title, sentences } = response as z.infer<
        typeof outputParser.schema
      >;

      console.log(`LLM response: ${JSON.stringify(response)}`);

      // Generate audio for each line using the selected provider
      const conversationsWithAudio = await Promise.all(
        sentences.map(async (conv, index) => {
          const role = index % 2 === 0 ? "A" : "B";
          const audioContent = await (env.TTS_PROVIDER === "google"
            ? generateGoogleSpeech(conv.hiragana, role, voiceMode)
            : generateOpenAISpeech(conv.hiragana));

          console.log(`Processing TTS: ${index} - ${conv.hiragana}`);

          if (!audioContent) {
            throw new Error("Failed to generate audio");
          }

          const audioUrl = `data:audio/mp3;base64,${audioContent.toString("base64")}`;
          return { ...conv, audioUrl };
        }),
      );

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

      return {
        practice,
        conversation,
      };
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

      return {
        ...conversation,
        content: conversation.content,
      };
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
