import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/shared/middleware/auth';
import type { ApiResponse, TokenPayload } from '@/shared/types';

/**
 * POST /api/auth/logout - 로그아웃
 */
export const POST = withAuth(async (_request: NextRequest, _payload: TokenPayload) => {
  // JWT 기반이라 서버 측 세션 무효화는 없음
  // 클라이언트에서 토큰 삭제 처리
  return NextResponse.json<ApiResponse>({ success: true, data: { message: '로그아웃 완료' } });
});
