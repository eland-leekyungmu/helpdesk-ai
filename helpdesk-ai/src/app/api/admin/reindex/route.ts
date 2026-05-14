import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import { feedbackService } from '@/services/feedback.service';
import type { ApiResponse, TokenPayload } from '@/shared/types';

/**
 * POST /api/admin/reindex - KB 재색인 트리거
 */
export const POST = withRole(['admin'], async (_request: NextRequest, _payload: TokenPayload) => {
  const result = await feedbackService.triggerReindex();
  return NextResponse.json<ApiResponse>({ success: true, data: result });
});
