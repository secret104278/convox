"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PlayCircleIcon,
  SpeakerWaveIcon,
  ArrowRightCircleIcon,
  ArrowPathIcon,
  StopIcon,
  ArrowUpCircleIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/solid";
import { api } from "~/trpc/react";
import { difficultySchema, type voiceModeSchema } from "~/types";
import { type z } from "zod";

// Utility function to match Japanese text with hiragana readings
function matchTextWithReadings(text: string, hiragana: string): string {
  const result: string[] = [];
  let textPos = 0;
  let hiraganaPos = 0;

  while (textPos < text.length && hiraganaPos < hiragana.length) {
    // If characters are the same, no ruby needed
    if (text[textPos] === hiragana[hiraganaPos]) {
      const char = text[textPos];
      if (char) result.push(char);
      textPos++;
      hiraganaPos++;
      continue;
    }

    // Look ahead to find the next matching position
    let lookAhead = 1;
    let found = false;
    let matchLength = 0;

    while (textPos + lookAhead <= text.length && !found) {
      let hiraganaLength = 0;

      // Find how many hiragana characters correspond to this text part
      for (let i = hiraganaPos; i < hiragana.length; i++) {
        hiraganaLength++;
        if (text[textPos + lookAhead] === hiragana[i + 1]) {
          found = true;
          break;
        }
      }

      if (found || textPos + lookAhead === text.length) {
        matchLength = hiraganaLength;
        break;
      }
      lookAhead++;
    }

    // Create ruby tag for the matched section
    const textPart = text.slice(textPos, textPos + lookAhead);
    const readingPart = hiragana.slice(hiraganaPos, hiraganaPos + matchLength);
    result.push(`<ruby>${textPart}<rt>${readingPart}</rt></ruby>`);

    textPos += lookAhead;
    hiraganaPos += matchLength;
  }

  // Add any remaining characters
  while (textPos < text.length) {
    const char = text[textPos];
    if (char) result.push(char);
    textPos++;
  }

  return result.join("");
}

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
  const [showHiragana, setShowHiragana] = useState(true);
  const [isSlowPlayback, setIsSlowPlayback] = useState(false);
  const [difficulty, setDifficulty] =
    useState<z.infer<typeof difficultySchema>>("JLPT N5");
  const [voiceMode, setVoiceMode] =
    useState<z.infer<typeof voiceModeSchema>>("different");

  // Add ref for the current conversation card
  const currentCardRef = useRef<HTMLDivElement>(null);
  const currentAudioController = useRef<AbortController | null>(null);

  const [selectedGrammarExplanation, setSelectedGrammarExplanation] = useState<
    string | null
  >(null);

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

  const playAudio = useCallback(
    (audioUrl: string) => {
      currentAudioController.current?.abort();
      currentAudioController.current = new AbortController();

      const audio = new Audio(audioUrl);
      audio.playbackRate = isSlowPlayback ? 0.75 : 1.0;
      audio.play().catch(console.error);
      currentAudioController.current.signal.onabort = () => {
        audio.pause();
      };
    },
    [isSlowPlayback],
  );

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
  }, [conversations, currentIndex, playAudio, selectedRole]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      // Automatically play audio if it's not the user's turn or if in All mode
      const prevConversation = conversations[prevIndex];
      if (
        prevConversation &&
        (selectedRole === "All" || prevConversation.role !== selectedRole) &&
        prevConversation.audioUrl
      ) {
        playAudio(prevConversation.audioUrl);
      }
    }
  }, [conversations, currentIndex, playAudio, selectedRole]);

  const replayAudio = useCallback(() => {
    const currentConv = conversations[currentIndex];
    if (currentConv?.audioUrl) {
      playAudio(currentConv.audioUrl);
    }
  }, [conversations, currentIndex, playAudio]);

  const startPractice = useCallback(() => {
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
  }, [conversations, playAudio, selectedRole]);

  const resetPractice = () => {
    currentAudioController.current?.abort();
    setIsPracticing(false);
    setCurrentIndex(-1);
  };

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
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          if (isPracticing) handleNext();
          break;
        case "ArrowLeft":
          event.preventDefault();
          if (isPracticing) handlePrevious();
          break;
        case "ArrowUp":
          event.preventDefault();
          if (isPracticing) replayAudio();
          break;
        case "Enter":
          event.preventDefault();
          startPractice();
          break;
        case " ":
          event.preventDefault();
          resetPractice();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [
    isPracticing,
    currentIndex,
    handleNext,
    handlePrevious,
    replayAudio,
    startPractice,
  ]);

  const isLastLine = currentIndex === conversations.length - 1;
  const isFirstLine = currentIndex === 0;

  return (
    <div className="relative min-h-[50vh]">
      <div className="card -mx-4 rounded-none bg-base-200 shadow-xl sm:mx-0 sm:rounded-xl">
        <div className="card-body p-4 sm:p-8">
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
              <div className="mt-4 flex flex-wrap gap-4">
                <select
                  className="select select-bordered w-full sm:w-auto"
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as typeof difficulty)
                  }
                >
                  {difficultySchema.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  className="select select-bordered w-full sm:w-auto"
                  value={voiceMode}
                  onChange={(e) =>
                    setVoiceMode(
                      e.target.value as z.infer<typeof voiceModeSchema>,
                    )
                  }
                >
                  <option value="different">不同聲音</option>
                  <option value="same">相同聲音</option>
                </select>
                <button
                  className="btn btn-primary w-full gap-2 sm:w-auto"
                  onClick={() =>
                    generateMutation.mutate({
                      prompt,
                      practiceId,
                      difficulty,
                      voiceMode,
                    })
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

          {currentConversation && (
            <>
              <div className="divider"></div>
              <h2 className="mb-4 text-xl font-bold">
                {currentConversation.title}
              </h2>
              <div className="space-y-4 pb-32 sm:pb-24">
                {conversations.map((conv, index) => (
                  <div
                    key={index}
                    ref={index === currentIndex ? currentCardRef : undefined}
                    className={`group card min-w-0 ${
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
                      <div className="flex flex-wrap items-center gap-4">
                        <div
                          className={`badge shrink-0 ${
                            conv.role === selectedRole
                              ? "badge-accent"
                              : "badge-neutral"
                          }`}
                        >
                          {conv.role}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <div
                            className={`group/text break-words font-bold ${
                              isBlurMode
                                ? "blur-sm transition-all duration-200 hover:blur-none"
                                : ""
                            }`}
                            dangerouslySetInnerHTML={{
                              __html: showHiragana
                                ? matchTextWithReadings(
                                    conv.text ?? "",
                                    conv.hiragana ?? "",
                                  )
                                : (conv.text ?? ""),
                            }}
                          />
                        </div>
                        <div className="flex shrink-0 gap-2">
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
                          {conv.grammarExplanation && (
                            <button
                              className="btn btn-circle btn-ghost btn-sm"
                              onClick={() =>
                                setSelectedGrammarExplanation(
                                  conv.grammarExplanation,
                                )
                              }
                            >
                              <AcademicCapIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="mt-1 break-words opacity-60">
                          {conv.translation}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grammar Explanation Modal */}
      <dialog
        id="grammar_modal"
        className="modal modal-bottom sm:modal-middle"
        open={!!selectedGrammarExplanation}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedGrammarExplanation(null);
          }
        }}
      >
        <div className="modal-box">
          <h3 className="text-lg font-bold">文法說明</h3>
          <p className="whitespace-pre-wrap py-4">
            {selectedGrammarExplanation}
          </p>
          <div className="modal-action">
            <button
              className="btn"
              onClick={() => setSelectedGrammarExplanation(null)}
            >
              關閉
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setSelectedGrammarExplanation(null)}>
            close
          </button>
        </form>
      </dialog>

      {conversations.length > 0 && !isNew && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center bg-base-100 p-2 shadow-lg sm:p-4">
          <div className="flex w-full max-w-screen-lg flex-wrap items-center justify-center gap-2 px-2 sm:gap-4 sm:px-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <label className="label cursor-pointer gap-1 sm:gap-2">
                <span className="label-text text-sm sm:text-base">練習</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={isBlurMode}
                  onChange={() => setIsBlurMode(!isBlurMode)}
                />
              </label>
              <label className="label cursor-pointer gap-1 sm:gap-2">
                <span className="label-text text-sm sm:text-base">假名</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={showHiragana}
                  onChange={() => setShowHiragana(!showHiragana)}
                />
              </label>
              <label className="label cursor-pointer gap-1 sm:gap-2">
                <span className="label-text text-sm sm:text-base">慢速</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={isSlowPlayback}
                  onChange={() => setIsSlowPlayback(!isSlowPlayback)}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
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
                <button
                  className="btn btn-accent gap-2"
                  onClick={handlePrevious}
                  disabled={isFirstLine}
                >
                  <ArrowRightCircleIcon className="h-5 w-5 rotate-180" />
                </button>
              )}
              {isPracticing && (
                <button className="btn btn-accent gap-2" onClick={replayAudio}>
                  <ArrowUpCircleIcon className="h-5 w-5" />
                </button>
              )}
              {isPracticing && !isLastLine && (
                <button className="btn btn-accent gap-2" onClick={handleNext}>
                  <ArrowRightCircleIcon className="h-5 w-5" />
                </button>
              )}
              {(!isPracticing || isLastLine) && (
                <select
                  className="select select-bordered w-full sm:w-auto"
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
              {isPracticing && isLastLine && (
                <button
                  className="btn btn-secondary gap-2"
                  onClick={startPractice}
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              )}
              {isPracticing && (
                <button className="btn btn-error gap-2" onClick={resetPractice}>
                  <StopIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
