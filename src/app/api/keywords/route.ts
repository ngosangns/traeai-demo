import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { generalRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function GET() {
  try {
    const prisma = getPrisma();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keywords = await prisma.keyword.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error("Get keywords error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = generalRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const prisma = getPrisma();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { value } = await request.json();

    if (!value || typeof value !== "string" || value.trim().length === 0) {
      return NextResponse.json(
        { error: "Keyword value is required" },
        { status: 400 }
      );
    }

    const trimmedValue = value.trim().toLowerCase();

    // Check if keyword already exists for this user
    const existingKeyword = await prisma.keyword.findUnique({
      where: {
        userId_value: {
          userId: session.userId,
          value: trimmedValue,
        },
      },
    });

    if (existingKeyword) {
      return NextResponse.json(
        { error: "Keyword already exists" },
        { status: 409 }
      );
    }

    const keyword = await prisma.keyword.create({
      data: {
        userId: session.userId,
        value: trimmedValue,
      },
    });

    return NextResponse.json({ keyword }, { status: 201 });
  } catch (error) {
    console.error("Create keyword error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
