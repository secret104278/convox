import { useCallback, useEffect } from "react";
import { type Conversation } from "~/types";

interface PracticeControlsProps {
  conversations: Conversation[];
  currentIndex: number;
  isPracticing: boolean;
  selectedRole: "A" | "B" | "All";
  playAudio: (url: string) => void;
  stopAudio: () => void;
  onIndexChange: (index: number) => void;
  onPracticeStateChange: (isPracticing: boolean) => void;
}

export function usePracticeControls({
  conversations,
  currentIndex,
  isPracticing,
  selectedRole,
  playAudio,
  stopAudio,
  onIndexChange,
  onPracticeStateChange,
}: PracticeControlsProps) {
  const handleNext = useCallback(() => {
    if (currentIndex < conversations.length - 1) {
      const nextIndex = currentIndex + 1;
      onIndexChange(nextIndex);
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
  }, [conversations, currentIndex, onIndexChange, playAudio, selectedRole]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      onIndexChange(prevIndex);
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
  }, [conversations, currentIndex, onIndexChange, playAudio, selectedRole]);

  const replayAudio = useCallback(() => {
    const currentConv = conversations[currentIndex];
    if (currentConv?.audioUrl) {
      playAudio(currentConv.audioUrl);
    }
  }, [conversations, currentIndex, playAudio]);

  const startPractice = useCallback(() => {
    stopAudio();
    onPracticeStateChange(true);
    onIndexChange(0);
    // Play the first sentence if it's not the user's role or if in All mode
    const firstConversation = conversations[0];
    if (
      firstConversation &&
      (selectedRole === "All" || firstConversation.role !== selectedRole) &&
      firstConversation.audioUrl
    ) {
      playAudio(firstConversation.audioUrl);
    }
  }, [
    conversations,
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
    isLastLine: currentIndex === conversations.length - 1,
    isFirstLine: currentIndex === 0,
  };
}
