"use client";

import {
  PlusCircleIcon,
  EllipsisVerticalIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import { format } from "date-fns";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PracticeHistory() {
  const { data: practices } = api.conversations.getPractices.useQuery(
    undefined,
    {
      suspense: true,
    },
  );
  const router = useRouter();
  const utils = api.useUtils();
  const [expandedPractices, setExpandedPractices] = useState<Set<string>>(
    new Set(),
  );

  const deleteMutation = api.conversations.deletePractice.useMutation({
    onSuccess: async () => {
      await utils.conversations.getPractices.invalidate();
    },
  });

  const handleNewPractice = () => {
    router.push("/?new=true");
  };

  const handlePracticeClick = (practiceId: string) => {
    setExpandedPractices((prev) => {
      const next = new Set(prev);
      if (next.has(practiceId)) {
        next.delete(practiceId);
      } else {
        next.add(practiceId);
      }
      return next;
    });
  };

  const handleConversationClick = (
    practiceId: string,
    conversationId: string,
  ) => {
    router.push(`/?practice=${practiceId}&conversation=${conversationId}`);
  };

  const handleDeletePractice = async (
    e: React.MouseEvent,
    practiceId: string,
  ) => {
    e.preventDefault();
    if (confirm("確定要刪除這個練習嗎？")) {
      await deleteMutation.mutateAsync({ id: practiceId });
    }
  };

  return (
    <div className="drawer-side z-20">
      <label
        htmlFor="conversation-drawer"
        aria-label="close sidebar"
        className="drawer-overlay"
      ></label>
      <div className="menu min-h-full w-80 bg-base-200 p-4 text-base-content">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">歷史練習</h2>
          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleNewPractice}
            >
              <PlusCircleIcon className="h-4 w-4" />
              新練習
            </button>
            <label
              htmlFor="conversation-drawer"
              className="btn btn-circle btn-ghost drawer-button btn-sm lg:hidden"
            >
              ✕
            </label>
          </div>
        </div>
        <div className="w-full space-y-2">
          {practices?.map((practice) => (
            <div key={practice.id} className="flex w-full flex-col">
              <div className="flex w-full items-center">
                <div
                  role="button"
                  className="btn btn-ghost min-w-0 flex-1 justify-start gap-2 pr-2 normal-case"
                  onClick={() => handlePracticeClick(practice.id)}
                >
                  {expandedPractices.has(practice.id) ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="w-full truncate text-left">
                      {practice.title ?? practice.prompt}
                    </div>
                    <div className="text-left text-xs opacity-60">
                      {format(new Date(practice.createdAt), "MM/dd HH:mm")}
                    </div>
                  </div>
                  <div className="dropdown dropdown-end shrink-0">
                    <button
                      tabIndex={0}
                      className="btn btn-ghost btn-sm p-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>
                    <ul
                      tabIndex={0}
                      className="menu dropdown-content z-50 w-40 rounded-box bg-base-100 p-2 shadow-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <li>
                        <button
                          className="text-error"
                          onClick={(e) => handleDeletePractice(e, practice.id)}
                          disabled={deleteMutation.isPending}
                        >
                          刪除練習
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              {expandedPractices.has(practice.id) && (
                <div className="ml-6 mt-2 space-y-2">
                  {practice.conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      role="button"
                      className="btn btn-ghost btn-sm h-auto min-h-12 w-full justify-start normal-case"
                      onClick={() =>
                        handleConversationClick(practice.id, conversation.id)
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <div className="w-full truncate text-left">
                          {conversation.title ?? "未命名對話"}
                        </div>
                        <div className="text-left text-xs opacity-60">
                          {format(
                            new Date(conversation.createdAt),
                            "MM/dd HH:mm",
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
