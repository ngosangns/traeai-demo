import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';
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

    if (username.length < 3 || password.length < 6) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters and password at least 6 characters' },
        { status: 400 }
      );
    }

    const user = await createUser(username, password);
    await createSession(user);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Username already exists') {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
