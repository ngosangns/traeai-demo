import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { authRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = authRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = await authenticateUser(username, password);
    await createSession(user);

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
