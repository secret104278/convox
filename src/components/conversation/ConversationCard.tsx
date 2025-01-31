import { PlayCircleIcon, AcademicCapIcon } from "@heroicons/react/24/solid";
import { type Conversation } from "~/types";
import { matchTextWithReadings } from "~/utils/textProcessing";

interface ConversationCardProps {
  conversation: Conversation;
  isActive: boolean;
  isPracticing: boolean;
  selectedRole: "A" | "B" | "All";
  isBlurMode: boolean;
  showHiragana: boolean;
  onPlayAudio: (url: string) => void;
  onShowGrammar: (explanation: string) => void;
  cardRef?: React.RefObject<HTMLDivElement>;
}

export function ConversationCard({
  conversation,
  isActive,
  isPracticing,
  selectedRole,
  isBlurMode,
  showHiragana,
  onPlayAudio,
  onShowGrammar,
  cardRef,
}: ConversationCardProps) {
  return (
    <div
      ref={cardRef}
      className={`group card min-w-0 ${
        isActive
          ? conversation.role === selectedRole
            ? "bg-accent bg-opacity-10 ring-2 ring-accent"
            : "bg-primary bg-opacity-10 ring-2 ring-primary"
          : "bg-base-300"
      }`}
    >
      <div className="card-body gap-2 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={`badge shrink-0 ${
              conversation.role === selectedRole
                ? "badge-accent"
                : "badge-neutral"
            }`}
          >
            {conversation.role}
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
                      conversation.text ?? "",
                      conversation.hiragana ?? "",
                    )
                  : (conversation.text ?? ""),
              }}
            />
          </div>
          <div className="flex shrink-0 gap-2">
            {conversation.audioUrl && (isActive || !isPracticing) && (
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={() =>
                  conversation.audioUrl && onPlayAudio(conversation.audioUrl)
                }
                aria-label="Play audio"
              >
                <PlayCircleIcon className="h-5 w-5" />
              </button>
            )}
            {conversation.grammarExplanation && (
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={() => onShowGrammar(conversation.grammarExplanation!)}
              >
                <AcademicCapIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <div className="mt-1 break-words opacity-60">
            {conversation.translation}
          </div>
        </div>
      </div>
    </div>
  );
}
