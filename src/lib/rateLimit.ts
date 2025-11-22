import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter
const rateLimit = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function createRateLimit(options: RateLimitOptions) {
  return function rateLimitMiddleware(request: NextRequest): NextResponse | null {
    const ip = request.ip || 'unknown';
    const key = `rate_limit:${ip}`;
    const now = Date.now();
    
    const current = rateLimit.get(key);
    
    if (current && now < current.resetTime) {
      if (current.count >= options.max) {
        return NextResponse.json(
          { error: 'Too many requests, please try again later.' },
          { status: 429 }
        );
      }
      
      current.count++;
    } else {
      rateLimit.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
    }
    
    // Clean up old entries
    for (const [k, v] of rateLimit.entries()) {
      if (now >= v.resetTime) {
        rateLimit.delete(k);
      }
    }
    
    return null;
  };
}

// Specific rate limits for different endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
});

export const generalRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60 // limit each IP to 60 requests per minute
});