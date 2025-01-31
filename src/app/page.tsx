import { ConversationPractice } from "~/components/ConversationPractice";
import { PracticeHistory } from "~/components/PracticeHistory";
import { LanguageIcon, Bars3Icon } from "@heroicons/react/24/solid";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-base-100">
      <div className="drawer lg:drawer-open">
        <input
          id="conversation-drawer"
          type="checkbox"
          className="drawer-toggle"
        />
        <div className="drawer-content">
          {/* Mobile toggle button */}
          <div className="mx-auto max-w-5xl px-4 py-8">
            <div className="relative flex flex-col items-center">
              <div className="absolute -left-4 top-2 lg:hidden">
                <label
                  htmlFor="conversation-drawer"
                  className="btn btn-ghost drawer-button"
                >
                  <Bars3Icon className="h-6 w-6" />
                </label>
              </div>
              <div className="flex justify-center gap-4">
                <LanguageIcon className="h-16 w-16 text-primary" />
                <h1 className="mb-8 text-5xl font-bold sm:text-7xl">ConvoX</h1>
              </div>
            </div>
            <div className="mb-12 flex items-center justify-center gap-2">
              <p className="text-xl">
                Practice conversations with AI-generated dialogues and audio.
              </p>
            </div>
            <ConversationPractice />
          </div>
        </div>

        <PracticeHistory />
      </div>
    </main>
  );
}
