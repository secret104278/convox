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
import { llmConversationSchema, difficultySchema } from "~/types/db";

const outputParser = StructuredOutputParser.fromZodSchema(
  llmConversationSchema,
);

// Initialize TTS clients
const googleTts = new TextToSpeechClient({
  keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
});

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

async function generateGoogleSpeech(text: string): Promise<Buffer> {
  const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest =
    {
      input: { text },
      voice: {
        languageCode: "ja-JP",
        name: "ja-JP-Neural2-B",
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
      }),
    )
    .mutation(async ({ input }) => {
      const { prompt, practiceId, difficulty } = input;

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
3. Traditional Chinese translation, please do not use Simplified Chinese

Also, generate a short title that summarizes the theme or content of the conversation.

Requirements:
- Generate a conversation at ${difficulty} level
- Avoid topics like ${existingTitles.map((title) => `"${title}"`).join(", ")}
- Make the conversation lively and include appropriate humor
- Use natural spoken language
- Ensure the content reflects real-life situations
- You can include some Japanese cultural elements
- Avoid overly formal or stiff expressions
- Make the conversation sound like a real exchange between friends`,
        ),
      ]);

      const { title, sentences } = response as z.infer<
        typeof outputParser.schema
      >;

      // Generate audio for each line using the selected provider
      const conversationsWithAudio = await Promise.all(
        sentences.map(async (conv) => {
          const audioContent = await (env.TTS_PROVIDER === "google"
            ? generateGoogleSpeech(conv.hiragana)
            : generateOpenAISpeech(conv.hiragana));

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
        practice = await db.practice.findUnique({
          where: { id: practiceId },
          include: { conversations: true },
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
