import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPrisma } from '@/lib/prisma';
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prisma = getPrisma();
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Verify the keyword belongs to the current user
    const keyword = await prisma.keyword.findFirst({
      where: {
        id,
        userId: session.userId
      }
    });

    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword not found' },
        { status: 404 }
      );
    }

    await prisma.keyword.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Keyword deleted successfully' });
  } catch (error) {
    console.error('Delete keyword error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
