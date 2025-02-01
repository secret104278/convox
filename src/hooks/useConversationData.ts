import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import type {
  difficultySchema,
  voiceModeSchema,
  familiaritySchema,
  StreamingChunk,
  DeepPartialLLMConversation,
} from "~/types";
import { type z } from "zod";
import { useState, useCallback } from "react";

export type GenerateInput = {
  prompt: string;
  difficulty: z.infer<typeof difficultySchema>;
  voiceMode: z.infer<typeof voiceModeSchema>;
  familiarity: z.infer<typeof familiaritySchema>;
  practiceId?: string;
};

export function useConversationData() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const practiceId = searchParams.get("practice") ?? undefined;
  const conversationId = searchParams.get("conversation") ?? undefined;
  const isNew = searchParams.get("new") === "true";

  const [streamingConversation, setStreamingConversation] =
    useState<DeepPartialLLMConversation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: currentPractice, isLoading: isPracticeLoading } =
    api.conversations.getPractice.useQuery(
      { id: practiceId! },
      { enabled: !!practiceId },
    );

  const { data: currentConversation, isLoading: isConversationLoading } =
    api.conversations.getConversation.useQuery(
      { id: conversationId! },
      { enabled: !!conversationId },
    );

  const generateMutation = api.conversations.generate.useMutation();

  const generateConversation = useCallback(
    async (params: Omit<GenerateInput, "practiceId">) => {
      setStreamingConversation(null);
      setIsGenerating(true);

      try {
        const stream = await generateMutation.mutateAsync({
          ...params,
          practiceId,
        });

        for await (const chunk of stream as AsyncIterable<StreamingChunk>) {
          if (chunk.type === "llm_progress") {
            setStreamingConversation(chunk.data);
          } else if (chunk.type === "complete") {
            router.push(
              `/?practice=${practiceId ?? chunk.data.id}&conversation=${chunk.data.id}`,
            );
            setIsGenerating(false);
            setStreamingConversation(null);
          }
        }
      } catch (error) {
        console.error("Failed to start streaming:", error);
        setIsGenerating(false);
        setStreamingConversation(null);
      }
    },
    [generateMutation, practiceId, router],
  );

  return {
    currentPractice,
    currentConversation,
    isLoading: isPracticeLoading || isConversationLoading,
    isNew,
    generateConversation,
    isGenerating,
    streamingConversation,
  };
}
