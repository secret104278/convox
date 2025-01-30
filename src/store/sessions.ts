import { create } from "zustand";
import type { StateCreator } from "zustand";
import type { Conversation, ConversationSession } from "~/types/db";

interface GenerateResponse {
  conversations: Conversation[];
  sessionId: string;
}

interface SessionState {
  sessions: ConversationSession[];
  currentSessionId?: string;
  conversations: Conversation[];
  prompt: string;
  selectedRole: "A" | "B";
  currentIndex: number;
  isLoading: boolean;
  isPracticing: boolean;

  setSessions: (sessions: ConversationSession[]) => void;
  setCurrentSession: (session: ConversationSession) => void;
  setPrompt: (prompt: string) => void;
  setSelectedRole: (role: "A" | "B") => void;
  setCurrentIndex: (index: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsPracticing: (isPracticing: boolean) => void;
  setConversations: (conversations: Conversation[]) => void;
  setCurrentSessionId: (id: string | undefined) => void;
  resetPractice: () => void;
  generateConversation: () => Promise<void>;
}

export type SessionStore = StateCreator<SessionState>;

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  conversations: [],
  prompt: "",
  selectedRole: "A",
  currentIndex: -1,
  isLoading: false,
  isPracticing: false,

  setSessions: (sessions: ConversationSession[]) => set({ sessions }),
  
  setCurrentSession: (session: ConversationSession) => {
    set({
      currentSessionId: session.id,
      prompt: session.prompt,
      conversations: session.conversations,
      isPracticing: false,
      currentIndex: -1,
    });
  },

  setPrompt: (prompt: string) => set({ prompt }),
  setSelectedRole: (role: "A" | "B") => set({ selectedRole: role }),
  setCurrentIndex: (index: number) => set({ currentIndex: index }),
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  setIsPracticing: (isPracticing: boolean) => set({ isPracticing }),
  setConversations: (conversations: Conversation[]) => set({ conversations }),
  setCurrentSessionId: (id: string | undefined) => set({ currentSessionId: id }),

  resetPractice: () => set({ isPracticing: false, currentIndex: -1 }),

  generateConversation: async () => {
    const { prompt, currentSessionId } = get();
    set({ isLoading: true, isPracticing: false, currentIndex: -1 });

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, sessionId: currentSessionId }),
      });
      
      if (!response.ok) throw new Error("Failed to generate conversation");
      
      const data = await response.json() as GenerateResponse;
      set({
        conversations: data.conversations,
        currentSessionId: data.sessionId,
      });

      // Update sessions list
      const response2 = await fetch("/api/sessions");
      if (!response2.ok) throw new Error("Failed to fetch sessions");
      const newSessions = await response2.json() as ConversationSession[];
      set({ sessions: newSessions });
    } catch (error) {
      console.error("Error generating conversation:", error);
      alert("Failed to generate conversation. Please try again.");
    } finally {
      set({ isLoading: false });
    }
  },
})); 

