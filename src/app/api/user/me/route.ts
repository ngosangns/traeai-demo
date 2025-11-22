import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const prisma = getPrisma();
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        nativeLanguage: true,
        targetLanguage: true,
        elo: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const prisma = getPrisma();
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { nativeLanguage, targetLanguage } = await request.json();

    if (!nativeLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Native language and target language are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        nativeLanguage,
        targetLanguage
      },
      select: {
        id: true,
        username: true,
        nativeLanguage: true,
        targetLanguage: true,
        elo: true,
        createdAt: true
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
