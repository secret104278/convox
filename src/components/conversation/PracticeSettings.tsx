interface PracticeSettingsProps {
  isBlurMode: boolean;
  showHiragana: boolean;
  isSlowPlayback: boolean;
  onBlurModeChange: (value: boolean) => void;
  onShowHiraganaChange: (value: boolean) => void;
  onSlowPlaybackChange: (value: boolean) => void;
}

export function PracticeSettings({
  isBlurMode,
  showHiragana,
  isSlowPlayback,
  onBlurModeChange,
  onShowHiraganaChange,
  onSlowPlaybackChange,
}: PracticeSettingsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
      <label className="label cursor-pointer gap-1 sm:gap-2">
        <span className="label-text text-sm sm:text-base">練習</span>
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={isBlurMode}
          onChange={(e) => onBlurModeChange(e.target.checked)}
        />
      </label>
      <label className="label cursor-pointer gap-1 sm:gap-2">
        <span className="label-text text-sm sm:text-base">假名</span>
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={showHiragana}
          onChange={(e) => onShowHiraganaChange(e.target.checked)}
        />
      </label>
      <label className="label cursor-pointer gap-1 sm:gap-2">
        <span className="label-text text-sm sm:text-base">慢速</span>
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={isSlowPlayback}
          onChange={(e) => onSlowPlaybackChange(e.target.checked)}
        />
      </label>
    </div>
  );
}
