import { useCallback, useRef } from "react";

export function useAudioPlayback(isSlowPlayback: boolean) {
  const currentAudioController = useRef<AbortController | null>(null);

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

  const stopAudio = useCallback(() => {
    currentAudioController.current?.abort();
  }, []);

  return {
    playAudio,
    stopAudio,
  };
}
