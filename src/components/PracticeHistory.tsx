"use client";

import {
  PlusCircleIcon,
  EllipsisVerticalIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import { format } from "date-fns";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PracticeHistory() {
  const { data: practices, isLoading: isPracticesLoading } =
    api.conversations.getPractices.useQuery(undefined, {
      suspense: false,
    });
  const router = useRouter();
  const utils = api.useUtils();
  const [expandedPractices, setExpandedPractices] = useState<Set<string>>(
    new Set(),
  );
  const [editingPractice, setEditingPractice] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const deletePracticeMutation = api.conversations.deletePractice.useMutation({
    onSuccess: async () => {
      await utils.conversations.getPractices.invalidate();
    },
  });

  const updatePracticeTitleMutation =
    api.conversations.updatePracticeTitle.useMutation({
      onSuccess: async () => {
        await utils.conversations.getPractices.invalidate();
        setEditingPractice(null);
        (document.getElementById("rename_modal") as HTMLDialogElement)?.close();
      },
    });

  const deleteConversationMutation =
    api.conversations.deleteConversation.useMutation({
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
    // Close drawer on mobile
    const drawerCheckbox = document.getElementById(
      "conversation-drawer",
    ) as HTMLInputElement;
    if (drawerCheckbox) {
      drawerCheckbox.checked = false;
    }
    router.push(`/?practice=${practiceId}&conversation=${conversationId}`);
  };

  const handleDeletePractice = async (
    e: React.MouseEvent,
    practiceId: string,
  ) => {
    e.preventDefault();
    if (confirm("確定要刪除這個練習嗎？")) {
      await deletePracticeMutation.mutateAsync({ id: practiceId });
    }
  };

  const handleStartEditPractice = (
    e: React.MouseEvent,
    practice: { id: string; title?: string | null; prompt: string },
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingPractice({
      id: practice.id,
      title: practice.title ?? practice.prompt,
    });
    (document.getElementById("rename_modal") as HTMLDialogElement)?.showModal();
  };

  const handleSavePracticeTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPractice?.title.trim()) {
      await updatePracticeTitleMutation.mutateAsync({
        id: editingPractice.id,
        title: editingPractice.title.trim(),
      });
    }
  };

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    conversationId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("確定要刪除這個對話嗎？")) {
      await deleteConversationMutation.mutateAsync({ id: conversationId });
    }
  };

  return (
    <>
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
          {isPracticesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
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
                              className="gap-2"
                              onClick={(e) =>
                                handleStartEditPractice(e, practice)
                              }
                            >
                              <PencilIcon className="h-4 w-4" />
                              重新命名
                            </button>
                          </li>
                          <li>
                            <button
                              className={`text-error ${deletePracticeMutation.isPending ? "loading" : ""}`}
                              onClick={(e) =>
                                handleDeletePractice(e, practice.id)
                              }
                              disabled={deletePracticeMutation.isPending}
                            >
                              {deletePracticeMutation.isPending ? (
                                <span className="loading loading-spinner loading-sm"></span>
                              ) : (
                                "刪除練習"
                              )}
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
                            handleConversationClick(
                              practice.id,
                              conversation.id,
                            )
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
                          <div className="dropdown dropdown-end">
                            <button
                              className="btn btn-ghost btn-sm p-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                            >
                              <EllipsisVerticalIcon className="h-4 w-4" />
                            </button>
                            <ul
                              className="menu dropdown-content z-50 w-40 rounded-box bg-base-100 p-2 shadow-xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                            >
                              <li>
                                <button
                                  className={`text-error ${deleteConversationMutation.isPending ? "loading" : ""}`}
                                  onClick={(e) =>
                                    handleDeleteConversation(e, conversation.id)
                                  }
                                  disabled={
                                    deleteConversationMutation.isPending
                                  }
                                >
                                  {deleteConversationMutation.isPending ? (
                                    <span className="loading loading-spinner loading-sm"></span>
                                  ) : (
                                    "刪除對話"
                                  )}
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <dialog id="rename_modal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">重新命名練習</h3>
          <form onSubmit={handleSavePracticeTitle}>
            <div className="py-4">
              <input
                type="text"
                className="input input-bordered w-full"
                value={editingPractice?.title ?? ""}
                onChange={(e) =>
                  setEditingPractice(
                    (prev) => prev && { ...prev, title: e.target.value },
                  )
                }
                placeholder="輸入新名稱"
              />
            </div>
            <div className="modal-action">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setEditingPractice(null);
                  (
                    document.getElementById("rename_modal") as HTMLDialogElement
                  )?.close();
                }}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updatePracticeTitleMutation.isPending}
              >
                {updatePracticeTitleMutation.isPending ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "儲存"
                )}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
