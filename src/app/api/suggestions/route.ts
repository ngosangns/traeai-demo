import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import {
  generatePracticeSuggestions,
  SuggestionsUnavailableError,
} from "@/lib/suggestionService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10);
    // const cursor = searchParams.get('cursor'); // TODO: Implement cursor-based pagination

    // Get user with keywords
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        keywords: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get keywords or use defaults if none exist
    const keywords =
      user.keywords.length > 0
        ? user.keywords.map((k) => k.value)
        : ["family", "work", "food", "travel", "health"];

    // Generate suggestions using the service
    let suggestions;
    try {
      suggestions = await generatePracticeSuggestions(
        keywords,
        user.elo,
        limit,
        user.nativeLanguage,
        user.targetLanguage
      );
    } catch (e) {
      console.error("Suggestions generation error:", e);
      if (e instanceof SuggestionsUnavailableError) {
        return NextResponse.json(
          { error: "Suggestions unavailable" },
          { status: 503 }
        );
      }
      throw e;
    }

    // Generate next cursor for pagination
    const nextCursor =
      suggestions.length === limit
        ? Buffer.from(
            JSON.stringify({
              timestamp: Date.now(),
              seed: Math.random().toString(36).substr(2, 9),
            })
          ).toString("base64")
        : undefined;

    return NextResponse.json({
      items: suggestions,
      nextCursor,
    });
  } catch (error) {
    console.error("Get suggestions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
