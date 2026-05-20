import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import type { TokenPayload } from '../types';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';

/**
 * JWT 토큰 검증 및 페이로드 추출
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Request에서 Bearer 토큰 추출
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * 인증 미들웨어 - 토큰 검증
 */
export function withAuth(
  handler: (request: NextRequest, payload: TokenPayload) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증 토큰이 필요합니다.' },
        { status: 401 },
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401 },
      );
    }

    return handler(request, payload);
  };
}

/**
 * Role 기반 인가 미들웨어
 */
export function withRole(
  roles: UserRole[],
  handler: (request: NextRequest, payload: TokenPayload) => Promise<NextResponse>,
) {
  return withAuth(async (request, payload) => {
    if (!roles.includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: '접근 권한이 없습니다.' },
        { status: 403 },
      );
    }
    return handler(request, payload);
  });
}


// Alias for Unit 2 compatibility — direct call pattern
import type { AuthUser } from './auth-types';
export type { AuthUser } from './auth-types';

export async function requireAuth(
  request: NextRequest,
  allowedRoles?: string[],
): Promise<{ user: AuthUser } | { error: { code: string; message: string; status: number } }> {
  const token = extractToken(request);
  if (!token) {
    return { error: { code: "UNAUTHORIZED", message: "인증 토큰이 필요합니다.", status: 401 } };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다.", status: 401 } };
  }

  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    return { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다.", status: 403 } };
  }

  return {
    user: {
      id: payload.userId,
      email: payload.email,
      name: payload.email.split("@")[0],
      role: payload.role as AuthUser["role"],
      teamId: "",
    },
  };
}
