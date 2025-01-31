import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import {
  type difficultySchema,
  type voiceModeSchema,
  type familiaritySchema,
} from "~/types";
import { type z } from "zod";

export function useConversationData() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const practiceId = searchParams.get("practice") ?? undefined;
  const conversationId = searchParams.get("conversation") ?? undefined;
  const isNew = searchParams.get("new") === "true";

  const utils = api.useUtils();

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

  const generateMutation = api.conversations.generate.useMutation({
    onSuccess: async (result) => {
      await utils.conversations.getPractices.invalidate();
      if (result.practice.id) {
        await utils.conversations.getPractice.invalidate({
          id: result.practice.id,
        });
      }
      if (result.conversation.id) {
        await utils.conversations.getConversation.invalidate({
          id: result.conversation.id,
        });
      }
      router.push(
        `/?practice=${result.practice.id}&conversation=${result.conversation.id}`,
      );
    },
  });

  const generateConversation = async (params: {
    prompt: string;
    difficulty: z.infer<typeof difficultySchema>;
    voiceMode: z.infer<typeof voiceModeSchema>;
    familiarity: z.infer<typeof familiaritySchema>;
  }) => {
    return generateMutation.mutateAsync({
      ...params,
      practiceId,
    });
  };

  return {
    currentPractice,
    currentConversation,
    isLoading: isPracticeLoading || isConversationLoading,
    isNew,
    generateConversation,
    isPending: generateMutation.isPending,
  };
}
