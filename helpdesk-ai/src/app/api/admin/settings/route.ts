import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import type { ApiResponse, TokenPayload } from '@/shared/types';

// 설정은 간단한 key-value로 DB에 저장하거나 환경변수로 관리
// 현재는 메모리 기반 (추후 DB 테이블 추가 가능)
let settings = {
  confidenceThreshold: 0.7,
  autoAssignEnabled: true,
  maxLoginAttempts: 5,
  lockDurationMinutes: 30,
};

/**
 * GET /api/admin/settings - 현재 설정 조회
 */
export const GET = withRole(['admin'], async (_request: NextRequest, _payload: TokenPayload) => {
  return NextResponse.json<ApiResponse>({ success: true, data: settings });
});

/**
 * PUT /api/admin/settings - 설정 변경
 */
export const PUT = withRole(['admin'], async (request: NextRequest, _payload: TokenPayload) => {
  const body = await request.json();

  if (body.confidenceThreshold !== undefined) {
    const val = Number(body.confidenceThreshold);
    if (val < 0 || val > 1) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'confidenceThreshold는 0~1 사이여야 합니다.' },
        { status: 400 },
      );
    }
    settings.confidenceThreshold = val;
  }

  if (body.autoAssignEnabled !== undefined) {
    settings.autoAssignEnabled = Boolean(body.autoAssignEnabled);
  }

  if (body.maxLoginAttempts !== undefined) {
    settings.maxLoginAttempts = Number(body.maxLoginAttempts);
  }

  if (body.lockDurationMinutes !== undefined) {
    settings.lockDurationMinutes = Number(body.lockDurationMinutes);
  }

  return NextResponse.json<ApiResponse>({ success: true, data: settings });
});
