import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPrisma } from '@/lib/prisma';
import { updateElo, evaluateAnswer } from '@/lib/eloService';
import { generalRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    // Apply rate limiting
    const rateLimitResponse = generalRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { exerciseId, answer, exerciseType, difficultyRating, correctAnswer } = await request.json();

    if (!exerciseId || answer === undefined || !exerciseType || difficultyRating === undefined || !correctAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current user with Elo
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { elo: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Evaluate the answer
    const isCorrect = evaluateAnswer(exerciseType, answer, correctAnswer);
    
    // Update Elo
    const eloResult = updateElo(user.elo, difficultyRating, isCorrect);

    // Update user's Elo in database
    await prisma.user.update({
      where: { id: session.userId },
      data: { elo: eloResult.newElo }
    });

    return NextResponse.json({
      isCorrect,
      deltaElo: eloResult.deltaElo,
      newElo: eloResult.newElo
    });
  } catch (error) {
    console.error('Practice submit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
