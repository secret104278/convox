import { useCallback, useEffect } from "react";
import { type ConversationSentence } from "~/types";

interface PracticeControlsProps {
  sentences: ConversationSentence[];
  currentIndex: number;
  isPracticing: boolean;
  selectedRole: "A" | "B" | "All";
  playAudio: (url: string) => void;
  stopAudio: () => void;
  onIndexChange: (index: number) => void;
  onPracticeStateChange: (isPracticing: boolean) => void;
}

export function usePracticeControls({
  sentences,
  currentIndex,
  isPracticing,
  selectedRole,
  playAudio,
  stopAudio,
  onIndexChange,
  onPracticeStateChange,
}: PracticeControlsProps) {
  const handleNext = useCallback(() => {
    if (currentIndex < sentences.length - 1) {
      const nextIndex = currentIndex + 1;
      onIndexChange(nextIndex);
      // Automatically play audio if it's not the user's turn or if in All mode
      const nextSentences = sentences[nextIndex];
      if (
        nextSentences &&
        (selectedRole === "All" || nextSentences.role !== selectedRole) &&
        nextSentences.audioUrl
      ) {
        playAudio(nextSentences.audioUrl);
      }
    }
  }, [sentences, currentIndex, onIndexChange, playAudio, selectedRole]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      onIndexChange(prevIndex);
      // Automatically play audio if it's not the user's turn or if in All mode
      const prevSentences = sentences[prevIndex];
      if (
        prevSentences &&
        (selectedRole === "All" || prevSentences.role !== selectedRole) &&
        prevSentences.audioUrl
      ) {
        playAudio(prevSentences.audioUrl);
      }
    }
  }, [sentences, currentIndex, onIndexChange, playAudio, selectedRole]);

  const replayAudio = useCallback(() => {
    const currentConv = sentences[currentIndex];
    if (currentConv?.audioUrl) {
      playAudio(currentConv.audioUrl);
    }
  }, [sentences, currentIndex, playAudio]);

  const startPractice = useCallback(() => {
    stopAudio();
    onPracticeStateChange(true);
    onIndexChange(0);
    // Play the first sentence if it's not the user's role or if in All mode
    const firstSentences = sentences[0];
    if (
      firstSentences &&
      (selectedRole === "All" || firstSentences.role !== selectedRole) &&
      firstSentences.audioUrl
    ) {
      playAudio(firstSentences.audioUrl);
    }
  }, [
    sentences,
    playAudio,
    selectedRole,
    stopAudio,
    onIndexChange,
    onPracticeStateChange,
  ]);

  const resetPractice = useCallback(() => {
    stopAudio();
    onPracticeStateChange(false);
    onIndexChange(-1);
  }, [stopAudio, onPracticeStateChange, onIndexChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isPracticing) return;

      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlePrevious();
          break;
        case "ArrowUp":
          event.preventDefault();
          replayAudio();
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
  }, [isPracticing, handleNext, handlePrevious, replayAudio, resetPractice]);

  return {
    handleNext,
    handlePrevious,
    replayAudio,
    startPractice,
    resetPractice,
    isLastLine: currentIndex === sentences.length - 1,
    isFirstLine: currentIndex === 0,
  };
}
