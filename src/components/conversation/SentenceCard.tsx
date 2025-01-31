import clsx from "clsx";
import { PlayCircleIcon, AcademicCapIcon } from "@heroicons/react/24/solid";
import { type ConversationSentence } from "~/types";
import { matchTextWithReadings } from "~/utils/textProcessing";

interface SentenceCardProps {
  sentence: ConversationSentence;
  isActive: boolean;
  selectedRole: "A" | "B" | "All";
  isBlurMode: boolean;
  showHiragana: boolean;
  onPlayAudio: (url: string) => void;
  onShowGrammar: (explanation: string) => void;
  cardRef?: React.RefObject<HTMLDivElement>;
}

export function SentenceCard({
  sentence,
  isActive,
  selectedRole,
  isBlurMode,
  showHiragana,
  onPlayAudio,
  onShowGrammar,
  cardRef,
}: SentenceCardProps) {
  return (
    <div
      ref={cardRef}
      className={clsx(
        "group card min-w-0",
        isActive
          ? sentence.role === selectedRole
            ? "bg-accent bg-opacity-10 ring-2 ring-accent"
            : "bg-primary bg-opacity-10 ring-2 ring-primary"
          : "bg-base-300",
      )}
    >
      <div className="card-body gap-2 px-5 py-3">
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 flex-col items-center">
            <div
              className={clsx(
                "badge my-2",
                sentence.role === selectedRole
                  ? "badge-accent"
                  : "badge-neutral",
              )}
            >
              {sentence.role}
            </div>
            {sentence.audioUrl && (
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={() => onPlayAudio(sentence.audioUrl!)}
                aria-label="Play audio"
              >
                <PlayCircleIcon className="h-5 w-5" />
              </button>
            )}
            {sentence.grammarExplanation && (
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={() => onShowGrammar(sentence.grammarExplanation!)}
              >
                <AcademicCapIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="flex flex-grow flex-col gap-1">
            <div
              className={clsx(
                "group/text break-words font-bold",
                isBlurMode &&
                  "blur-sm transition-all duration-200 hover:blur-none",
              )}
              dangerouslySetInnerHTML={{
                __html: showHiragana
                  ? matchTextWithReadings(
                      sentence.text ?? "",
                      sentence.hiragana ?? "",
                    )
                  : (sentence.text ?? ""),
              }}
            />
            <div className="break-words text-sm opacity-60">
              {sentence.translation}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
