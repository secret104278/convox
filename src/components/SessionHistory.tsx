"use client";

import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { format } from "date-fns";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function SessionHistory() {
  const { data: sessions = [] } = api.conversations.getSessions.useQuery();
  const router = useRouter();

  const handleNewSession = () => {
    router.push("/?new=true");
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/?session=${sessionId}`);
  };

  return (
    <div className="drawer-side z-20">
      <label
        htmlFor="conversation-drawer"
        aria-label="close sidebar"
        className="drawer-overlay"
      ></label>
      <div className="menu bg-base-200 text-base-content min-h-full w-80 p-4">
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
              className="btn btn-circle btn-ghost btn-sm drawer-button lg:hidden"
            >
              ✕
            </label>
          </div>
        </div>
        <div className="space-y-2 w-full">
          {sessions.map((session) => (
            <button
              key={session.id}
              className="btn btn-ghost w-full justify-start gap-2 normal-case"
              onClick={() => handleSessionClick(session.id)}
            >
              <div className="flex flex-col items-start overflow-hidden">
                <div className="w-full truncate text-left">
                  {session.prompt}
                </div>
                <div className="text-xs opacity-60">
                  {format(new Date(session.createdAt), "MM/dd HH:mm")}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 
