"use client";

import {
  PlusCircleIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/solid";
import { format } from "date-fns";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function SessionHistory() {
  const { data: sessions } = api.conversations.getSessions.useQuery(undefined, {
    suspense: true,
  });
  const router = useRouter();
  const utils = api.useUtils();

  const deleteMutation = api.conversations.deleteSession.useMutation({
    onSuccess: async () => {
      await utils.conversations.getSessions.invalidate();
    },
  });

  const handleNewSession = () => {
    router.push("/?new=true");
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/?session=${sessionId}`);
  };

  const handleDeleteSession = async (
    e: React.MouseEvent,
    sessionId: string,
  ) => {
    e.preventDefault();
    if (confirm("確定要刪除這個對話嗎？")) {
      await deleteMutation.mutateAsync({ id: sessionId });
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
          <h2 className="text-lg font-bold">歷史對話</h2>
          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleNewSession}
            >
              <PlusCircleIcon className="h-4 w-4" />
              新對話
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
          {sessions!.map((session) => (
            <div key={session.id} className="flex w-full items-center">
              <div
                role="button"
                className="btn btn-ghost min-w-0 flex-1 justify-start gap-2 pr-2 normal-case"
                onClick={() => handleSessionClick(session.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="w-full truncate text-left">
                    {session.prompt}
                  </div>
                  <div className="text-left text-xs opacity-60">
                    {format(new Date(session.createdAt), "MM/dd HH:mm")}
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
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        disabled={deleteMutation.isPending}
                      >
                        刪除對話
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
