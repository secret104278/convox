"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PlayCircleIcon,
  SpeakerWaveIcon,
  ArrowRightCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  StopIcon,
  ArrowUpCircleIcon,
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

  const conversations = useMemo(
    () => currentConversation?.content ?? [],
    [currentConversation],
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
      setCurrentIndex(-1);
      setIsPracticing(false);
      router.push(
        `/?practice=${result.practice.id}&conversation=${result.conversation.id}`,
      );
    },
  });

  const [prompt, setPrompt] = useState(currentPractice?.prompt ?? "");
  const [selectedRole, setSelectedRole] = useState<"A" | "B" | "All">("All");
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPracticing, setIsPracticing] = useState(false);
  const [isBlurMode, setIsBlurMode] = useState(false);

  // Add ref for the current conversation card
  const currentCardRef = useRef<HTMLDivElement>(null);
  const currentAudioController = useRef<AbortController | null>(null);

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

  const handleNext = useCallback(() => {
    if (currentIndex < conversations.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      // Automatically play audio if it's not the user's turn or if in All mode
      const nextConversation = conversations[nextIndex];
      if (
        nextConversation &&
        (selectedRole === "All" || nextConversation.role !== selectedRole) &&
        nextConversation.audioUrl
      ) {
        playAudio(nextConversation.audioUrl);
      }
    }
  }, [conversations, currentIndex, selectedRole]);

  const replayAudio = useCallback(() => {
    const currentConv = conversations[currentIndex];
    if (currentConv?.audioUrl) {
      playAudio(currentConv.audioUrl);
    }
  }, [conversations, currentIndex]);

  // Add effect for scrolling
  useEffect(() => {
    if (currentCardRef.current && isPracticing) {
      currentCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex, isPracticing]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isPracticing) {
        switch (event.key) {
          case "ArrowRight":
            event.preventDefault();
            handleNext();
            break;
          case "ArrowUp":
            event.preventDefault();
            replayAudio();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isPracticing, currentIndex, handleNext, replayAudio]);

  const startPractice = () => {
    currentAudioController.current?.abort();

    setIsPracticing(true);
    setCurrentIndex(0);
    // Play the first sentence if it's not the user's role or if in All mode
    const firstConversation = conversations[0];
    if (
      firstConversation &&
      (selectedRole === "All" || firstConversation.role !== selectedRole) &&
      firstConversation.audioUrl
    ) {
      playAudio(firstConversation.audioUrl);
    }
  };

  const playAudio = (audioUrl: string) => {
    currentAudioController.current?.abort();
    currentAudioController.current = new AbortController();

    const audio = new Audio(audioUrl);
    audio.play().catch(console.error);
    currentAudioController.current.signal.onabort = () => {
      audio.pause();
    };
  };

  const resetPractice = () => {
    currentAudioController.current?.abort();
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
                className="textarea textarea-bordered h-16"
                placeholder="輸入主題"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!isNew}
              />
              <div className="mt-4 flex gap-4">
                <button
                  className="btn btn-primary gap-2"
                  onClick={() =>
                    generateMutation.mutate({ prompt, practiceId })
                  }
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <span className="loading loading-spinner"></span>
                  ) : isNew ? (
                    <SpeakerWaveIcon className="h-5 w-5" />
                  ) : (
                    <ArrowPathIcon className="h-5 w-5" />
                  )}
                  {generateMutation.isPending
                    ? "生成中..."
                    : isNew
                      ? "生成對話"
                      : "生成更多對話"}
                </button>
              </div>
            </div>
          )}

          <div className="divider"></div>

          <div className="space-y-4 pb-24">
            {conversations.map((conv, index) => (
              <div
                key={index}
                ref={index === currentIndex ? currentCardRef : undefined}
                className={`group card ${
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
                    <div className="flex-grow">
                      <div
                        className={`group/text font-bold ${
                          isBlurMode
                            ? "blur-sm transition-all duration-200 hover:blur-none"
                            : ""
                        }`}
                      >
                        {conv.text}
                      </div>
                    </div>
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
                  <div className="flex flex-col gap-1 text-sm">
                    <div
                      className={`${
                        isBlurMode
                          ? "blur-sm transition-all duration-200 hover:blur-none"
                          : ""
                      } opacity-60`}
                    >
                      {conv.hiragana}
                    </div>
                    <div className="mt-1 opacity-60">{conv.translation}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {conversations.length > 0 && !isNew && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center bg-base-100 p-4 shadow-lg">
          <div className="flex items-center gap-4">
            {
              <button
                className={`btn gap-2 ${isBlurMode ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setIsBlurMode(!isBlurMode)}
              >
                {isBlurMode ? (
                  <>
                    <EyeSlashIcon className="h-4 w-4" />
                    練習模式開啟
                  </>
                ) : (
                  <>
                    <EyeIcon className="h-4 w-4" />
                    練習模式關閉
                  </>
                )}
              </button>
            }
            {(!isPracticing || isLastLine) && (
              <select
                className="select select-bordered"
                value={selectedRole}
                onChange={(e) =>
                  setSelectedRole(e.target.value as "A" | "B" | "All")
                }
              >
                <option value="A">角色 A</option>
                <option value="B">角色 B</option>
                <option value="All">角色 All</option>
              </select>
            )}
            {!isPracticing && (
              <button
                className="btn btn-secondary gap-2"
                onClick={startPractice}
              >
                <PlayCircleIcon className="h-5 w-5" />
                開始對話
              </button>
            )}
            {isPracticing && (
              <button className="btn btn-accent gap-2" onClick={replayAudio}>
                <ArrowUpCircleIcon className="h-5 w-5" />
                重聽
              </button>
            )}
            {isPracticing && !isLastLine && (
              <button className="btn btn-accent gap-2" onClick={handleNext}>
                <ArrowRightCircleIcon className="h-5 w-5" />
                下一句
              </button>
            )}
            {isPracticing && isLastLine && (
              <button
                className="btn btn-secondary gap-2"
                onClick={startPractice}
              >
                <ArrowPathIcon className="h-5 w-5" />
                重新練習
              </button>
            )}
            {isPracticing && (
              <button className="btn btn-error gap-2" onClick={resetPractice}>
                <StopIcon className="h-5 w-5" />
                停止練習
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
