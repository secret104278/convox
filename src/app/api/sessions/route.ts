import { db } from "~/server/db";
import type { Conversation, ConversationSession } from "~/types/db";

export async function GET() {
  try {
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

    return Response.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return Response.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
} 
