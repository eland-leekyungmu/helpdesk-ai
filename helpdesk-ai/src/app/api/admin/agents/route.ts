import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import { adminService } from '@/services/admin.service';
import type { ApiResponse, TokenPayload } from '@/shared/types';

/**
 * GET /api/admin/agents - 2차 처리자 목록
 */
export const GET = withRole(['admin', 'agent_l1'], async (request: NextRequest, _payload: TokenPayload) => {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId') || undefined;
  const isActive = searchParams.has('isActive')
    ? searchParams.get('isActive') === 'true'
    : undefined;

  const agents = await adminService.getAgentList({ teamId, isActive });
  return NextResponse.json<ApiResponse>({ success: true, data: agents });
});
