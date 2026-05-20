import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/shared/middleware/auth';
import { prisma } from '@/lib/prisma';
import type { ApiResponse, TokenPayload } from '@/shared/types';

export const GET = withAuth(async (_request: NextRequest, payload: TokenPayload) => {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      team: {
        include: {
          department: {
            include: { organization: true },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: '사용자를 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return NextResponse.json<ApiResponse>({ success: true, data: user });
});
