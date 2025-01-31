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
import { llmConversationSchema } from "~/types/db";

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
      }),
    )
    .mutation(async ({ input }) => {
      const { prompt, practiceId } = input;

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
          `Is a humorous and lively Japanese language teacher, teaching a student with JLPT N5 to N4 proficiency. They excel at creating fun and practical teaching materials.`,
        ),
        new HumanMessage(
          `請根據以下主題生成一段日文對話：${prompt}

請創造一段自然生動的日常對話，包含8-10次交流。每一句話都需要提供：
1. 日文原文（含漢字）
2. 平假名拼音
3. 繁體中文翻譯

同時，請為這段對話生成一個簡短的標題，用來概括對話的主題或內容。

要求：
- 請避免下雨、野餐等主題
- 對話要生動有趣，包含適當的幽默
- 使用自然的口語表達
- 對話內容要符合真實生活場景
- 可以加入一些日本文化相關的內容
- 避免過於正式或死板的表達
- 讓對話像真實朋友之間的交流`,
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
});
