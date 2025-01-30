import { ConversationPractice } from "~/components/ConversationPractice";
import { SessionHistory } from "~/components/SessionHistory";
import { LanguageIcon, SpeakerWaveIcon, Bars3Icon } from "@heroicons/react/24/solid";
import { db } from "~/server/db";
import type { Conversation, ConversationSession } from "~/types/db";

export default async function HomePage() {
  const dbSessions = await db.conversationSession.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  // Convert dates
  const sessions: ConversationSession[] = dbSessions.map(session => ({
    ...session,
    conversations: session.conversations as Conversation[],
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
  }));

  return (
    <main className="min-h-screen bg-base-100">
      <div className="drawer lg:drawer-open">
        <input id="conversation-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content">
          {/* Mobile toggle button */}
          <label
            htmlFor="conversation-drawer"
            className="btn btn-ghost drawer-button fixed top-4 left-4 z-30 lg:hidden"
          >
            <Bars3Icon className="h-6 w-6" />
          </label>

          <div className="mx-auto max-w-5xl px-4 py-8">
            <div className="flex justify-center gap-4">
              <LanguageIcon className="h-16 w-16 text-primary" />
              <h1 className="mb-8 text-5xl font-bold sm:text-7xl">
                ConvoX
              </h1>
            </div>
            <div className="flex items-center justify-center gap-2 mb-12">
              <SpeakerWaveIcon className="h-6 w-6" />
              <p className="text-xl">
                Practice conversations with AI-generated dialogues and audio.
              </p>
            </div>
            <ConversationPractice initialSessions={sessions} />
          </div>
        </div>

        <SessionHistory />
      </div>
    </main>
  );
}
