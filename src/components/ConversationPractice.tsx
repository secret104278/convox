"use client";

import { useEffect } from "react";
import { PlayCircleIcon, SpeakerWaveIcon, ArrowRightCircleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import type { ConversationSession } from "~/types/db";
import { useSessionStore } from "~/store/sessions";

interface Props {
  initialSessions: ConversationSession[];
}

export function ConversationPractice({ initialSessions }: Props) {
  const {
    prompt,
    conversations,
    selectedRole,
    currentIndex,
    isLoading,
    isPracticing,
    setPrompt,
    setSessions,
    setSelectedRole,
    setCurrentIndex,
    setIsPracticing,
    generateConversation,
    resetPractice,
  } = useSessionStore();

  // Initialize sessions on mount
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions, setSessions]);

  const startPractice = () => {
    setIsPracticing(true);
    setCurrentIndex(0);
    // Play the first sentence if it's not the user's role
    const firstConversation = conversations[0];
    if (firstConversation && firstConversation.role !== selectedRole && firstConversation.audioUrl) {
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
      if (nextConversation && nextConversation.role !== selectedRole && nextConversation.audioUrl) {
        playAudio(nextConversation.audioUrl);
      }
    }
  };

  const isLastLine = currentIndex === conversations.length - 1;

  return (
    <div className="relative min-h-[50vh]">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
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
                  className={`btn btn-primary gap-2 ${isLoading ? "loading" : ""}`}
                  onClick={generateConversation}
                  disabled={isLoading}
                >
                  <SpeakerWaveIcon className="h-5 w-5" />
                  {isLoading ? "生成中..." : "生成對話"}
                </button>
              )}
              {conversations.length > 0 && !isPracticing && (
                <>
                  <select
                    className="select select-bordered"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as "A" | "B")}
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
                    onClick={generateConversation}
                    disabled={isLoading}
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                    重新生成
                  </button>
                </>
              )}
            </div>
          </div>

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
                    <div className={`badge ${
                      conv.role === selectedRole ? "badge-accent" : "badge-neutral"
                    }`}>
                      {conv.role}
                    </div>
                    <div className="flex-grow font-bold">{conv.text}</div>
                    {conv.audioUrl && (index === currentIndex || !isPracticing) && (
                      <button
                        className="btn btn-circle btn-sm btn-ghost"
                        onClick={() => conv.audioUrl && playAudio(conv.audioUrl)}
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
        <div className="fixed bottom-0 left-0 right-0 flex justify-center p-4 bg-base-100 shadow-lg">
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
                  onClick={generateConversation}
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

