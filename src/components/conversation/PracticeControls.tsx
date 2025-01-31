import {
  PlayCircleIcon,
  ArrowRightCircleIcon,
  ArrowPathIcon,
  StopIcon,
  ArrowUpCircleIcon,
} from "@heroicons/react/24/solid";

interface PracticeControlsProps {
  isPracticing: boolean;
  isFirstLine: boolean;
  isLastLine: boolean;
  selectedRole: "A" | "B" | "All";
  onStart: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onReplay: () => void;
  onReset: () => void;
  onRoleChange: (role: "A" | "B" | "All") => void;
}

export function PracticeControls({
  isPracticing,
  isFirstLine,
  isLastLine,
  selectedRole,
  onStart,
  onNext,
  onPrevious,
  onReplay,
  onReset,
  onRoleChange,
}: PracticeControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
      {!isPracticing && (
        <button className="btn btn-secondary gap-2" onClick={onStart}>
          <PlayCircleIcon className="h-5 w-5" />
          開始對話
        </button>
      )}
      {(!isPracticing || isLastLine) && (
        <select
          className="select select-bordered w-auto"
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value as "A" | "B" | "All")}
        >
          <option value="A">角色 A</option>
          <option value="B">角色 B</option>
          <option value="All">角色 All</option>
        </select>
      )}
      {isPracticing && isLastLine && (
        <button className="btn btn-secondary gap-2" onClick={onStart}>
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      )}
      {isPracticing && (
        <button
          className="btn btn-accent gap-2"
          onClick={onPrevious}
          disabled={isFirstLine}
        >
          <ArrowRightCircleIcon className="h-5 w-5 rotate-180" />
        </button>
      )}
      {isPracticing && (
        <button className="btn btn-accent gap-2" onClick={onReplay}>
          <ArrowUpCircleIcon className="h-5 w-5" />
        </button>
      )}
      {isPracticing && (
        <button
          className="btn btn-accent gap-2"
          onClick={onNext}
          disabled={isLastLine}
        >
          <ArrowRightCircleIcon className="h-5 w-5" />
        </button>
      )}
      {isPracticing && (
        <button className="btn btn-error gap-2" onClick={onReset}>
          <StopIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
