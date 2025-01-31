"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PlayCircleIcon,
  SpeakerWaveIcon,
  ArrowRightCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { api } from "~/trpc/react";

export function ConversationPractice() {
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
  const conversations = currentConversation?.content ?? [];

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
      setCurrentIndex(-1);
      setIsPracticing(false);
      router.push(
        `/?practice=${result.practice.id}&conversation=${result.conversation.id}`,
      );
    },
  });

  const [prompt, setPrompt] = useState(currentPractice?.prompt ?? "");
  const [selectedRole, setSelectedRole] = useState<"A" | "B">("A");
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPracticing, setIsPracticing] = useState(false);

  useEffect(() => {
    if (currentPractice) {
      setPrompt(currentPractice.prompt);
    }
  }, [currentPractice]);

  useEffect(() => {
    if (isNew) {
      setPrompt("");
      setCurrentIndex(-1);
      setIsPracticing(false);
    }
  }, [isNew]);

  const startPractice = () => {
    setIsPracticing(true);
    setCurrentIndex(0);
    // Play the first sentence if it's not the user's role
    const firstConversation = conversations[0];
    if (
      firstConversation &&
      firstConversation.role !== selectedRole &&
      firstConversation.audioUrl
    ) {
      playAudio(firstConversation.audioUrl);
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(console.error);
  };

  const handleNext = () => {
    if (currentIndex < conversations.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      // Automatically play audio if it's not the user's turn
      const nextConversation = conversations[nextIndex];
      if (
        nextConversation &&
        nextConversation.role !== selectedRole &&
        nextConversation.audioUrl
      ) {
        playAudio(nextConversation.audioUrl);
      }
    }
  };

  const resetPractice = () => {
    setIsPracticing(false);
    setCurrentIndex(-1);
  };

  const isLastLine = currentIndex === conversations.length - 1;

  return (
    <div className="relative min-h-[50vh]">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          {isPracticeLoading || isConversationLoading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="form-control">
              <textarea
                className="textarea textarea-bordered h-32"
                placeholder="輸入場景（例如：生成一段關於在餐廳點餐的對話）"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isPracticing}
              />
              <div className="mt-4 flex gap-4">
                {!conversations.length && (
                  <button
                    className="btn btn-primary gap-2"
                    onClick={() =>
                      generateMutation.mutate({ prompt, practiceId })
                    }
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <span className="loading loading-spinner"></span>
                    ) : (
                      <SpeakerWaveIcon className="h-5 w-5" />
                    )}
                    {generateMutation.isPending ? "生成中..." : "生成對話"}
                  </button>
                )}
                {conversations.length > 0 && !isPracticing && (
                  <>
                    <select
                      className="select select-bordered"
                      value={selectedRole}
                      onChange={(e) =>
                        setSelectedRole(e.target.value as "A" | "B")
                      }
                    >
                      <option value="A">角色 A</option>
                      <option value="B">角色 B</option>
                    </select>
                    <button
                      className="btn btn-secondary gap-2"
                      onClick={startPractice}
                    >
                      開始練習
                    </button>
                    <button
                      className="btn btn-primary gap-2"
                      onClick={() =>
                        generateMutation.mutate({ prompt, practiceId })
                      }
                      disabled={generateMutation.isPending}
                    >
                      {generateMutation.isPending ? (
                        <span className="loading loading-spinner"></span>
                      ) : (
                        <ArrowPathIcon className="h-5 w-5" />
                      )}
                      {generateMutation.isPending
                        ? "重新生成中..."
                        : "重新生成"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="divider"></div>

          <div className="space-y-4 pb-24">
            {conversations.map((conv, index) => (
              <div
                key={index}
                className={`card ${
                  index === currentIndex
                    ? conv.role === selectedRole
                      ? "bg-accent bg-opacity-10 ring-2 ring-accent"
                      : "bg-primary bg-opacity-10 ring-2 ring-primary"
                    : index < currentIndex
                      ? "bg-base-300 opacity-50"
                      : "bg-base-300"
                }`}
              >
                <div className="card-body gap-2 py-3">
                  <div className="flex items-center gap-4">
                    <div
                      className={`badge ${
                        conv.role === selectedRole
                          ? "badge-accent"
                          : "badge-neutral"
                      }`}
                    >
                      {conv.role}
                    </div>
                    <div className="flex-grow font-bold">{conv.text}</div>
                    {conv.audioUrl &&
                      (index === currentIndex || !isPracticing) && (
                        <button
                          className="btn btn-circle btn-ghost btn-sm"
                          onClick={() =>
                            conv.audioUrl && playAudio(conv.audioUrl)
                          }
                          aria-label="Play audio"
                        >
                          <PlayCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                  </div>
                  <div className="text-sm opacity-60">
                    <div>{conv.hiragana}</div>
                    <div>{conv.translation}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isPracticing && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center bg-base-100 p-4 shadow-lg">
          <div className="flex gap-4">
            <button
              className="btn btn-accent gap-2"
              onClick={handleNext}
              disabled={isLastLine}
            >
              <ArrowRightCircleIcon className="h-5 w-5" />
              {isLastLine ? "練習完成" : "下一句"}
            </button>
            {isLastLine && (
              <>
                <button
                  className="btn btn-secondary gap-2"
                  onClick={resetPractice}
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  重新練習
                </button>
                <button
                  className="btn btn-primary gap-2"
                  onClick={() =>
                    generateMutation.mutate({ prompt, practiceId })
                  }
                >
                  <SpeakerWaveIcon className="h-5 w-5" />
                  生成新對話
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
