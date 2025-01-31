"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { SpeakerWaveIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { difficultySchema, type voiceModeSchema } from "~/types";
import { type z } from "zod";
import { useConversationData } from "~/hooks/useConversationData";
import { useAudioPlayback } from "~/hooks/useAudioPlayback";
import { usePracticeControls } from "~/hooks/usePracticeControls";
import { ConversationCard } from "./ConversationCard";
import { GrammarModal } from "./GrammarModal";
import { PracticeControls } from "./PracticeControls";
import { PracticeSettings } from "./PracticeSettings";

export function ConversationPractice() {
  const {
    currentPractice,
    currentConversation,
    isLoading,
    isNew,
    generateConversation,
    isPending,
  } = useConversationData();

  const conversations = useMemo(
    () =>
      currentConversation?.content.map((conv, index) => ({
        ...conv,
        id: `${currentConversation.id}-${index}`,
        createdAt: currentConversation.createdAt,
      })) ?? [],
    [currentConversation],
  );

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
  const [selectedGrammarExplanation, setSelectedGrammarExplanation] = useState<
    string | null
  >(null);

  // Add ref for the current conversation card
  const currentCardRef = useRef<HTMLDivElement>(null);

  const { playAudio, stopAudio } = useAudioPlayback(isSlowPlayback);

  const {
    handleNext,
    handlePrevious,
    replayAudio,
    startPractice,
    resetPractice,
    isLastLine,
    isFirstLine,
  } = usePracticeControls({
    conversations,
    currentIndex,
    isPracticing,
    selectedRole,
    playAudio,
    stopAudio,
    onIndexChange: setCurrentIndex,
    onPracticeStateChange: setIsPracticing,
  });

  // Effect for scrolling current card into view
  useEffect(() => {
    if (currentCardRef.current && isPracticing) {
      currentCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex, isPracticing]);

  useEffect(() => {
    if (currentPractice) {
      setPrompt(currentPractice.prompt);
    }
  }, [currentPractice]);

  return (
    <div className="relative min-h-[50vh]">
      <div className="card -mx-4 rounded-none bg-base-200 shadow-xl sm:mx-0 sm:rounded-xl">
        <div className="card-body p-4 sm:p-8">
          {isLoading ? (
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
                    generateConversation({
                      prompt,
                      difficulty,
                      voiceMode,
                    })
                  }
                  disabled={isPending}
                >
                  {isPending ? (
                    <span className="loading loading-spinner"></span>
                  ) : isNew ? (
                    <SpeakerWaveIcon className="h-5 w-5" />
                  ) : (
                    <ArrowPathIcon className="h-5 w-5" />
                  )}
                  {isPending
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
                  <ConversationCard
                    key={index}
                    conversation={conv}
                    isActive={index === currentIndex}
                    isPracticing={isPracticing}
                    selectedRole={selectedRole}
                    isBlurMode={isBlurMode}
                    showHiragana={showHiragana}
                    onPlayAudio={playAudio}
                    onShowGrammar={setSelectedGrammarExplanation}
                    cardRef={
                      index === currentIndex ? currentCardRef : undefined
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <GrammarModal
        explanation={selectedGrammarExplanation}
        onClose={() => setSelectedGrammarExplanation(null)}
      />

      {conversations.length > 0 && !isNew && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center bg-base-100 p-2 shadow-lg sm:p-4 lg:left-80">
          <div className="flex w-full max-w-screen-lg flex-wrap items-center justify-center gap-2 px-2 sm:gap-4 sm:px-4">
            <PracticeSettings
              isBlurMode={isBlurMode}
              showHiragana={showHiragana}
              isSlowPlayback={isSlowPlayback}
              onBlurModeChange={setIsBlurMode}
              onShowHiraganaChange={setShowHiragana}
              onSlowPlaybackChange={setIsSlowPlayback}
            />

            <PracticeControls
              isPracticing={isPracticing}
              isFirstLine={isFirstLine}
              isLastLine={isLastLine}
              selectedRole={selectedRole}
              onStart={startPractice}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onReplay={replayAudio}
              onReset={resetPractice}
              onRoleChange={setSelectedRole}
            />
          </div>
        </div>
      )}
    </div>
  );
}
