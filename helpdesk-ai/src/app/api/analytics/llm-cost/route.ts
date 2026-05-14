import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import { analyticsService } from '@/services/analytics.service';
import type { ApiResponse, TokenPayload } from '@/shared/types';

/**
 * GET /api/analytics/llm-cost - LLM 비용 통계
 */
export const GET = withRole(['admin', 'agent_l1'], async (request: NextRequest, _payload: TokenPayload) => {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const groupBy = (searchParams.get('groupBy') || 'model') as 'model' | 'day' | 'week';

  if (!from || !to) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'from, to 파라미터가 필요합니다.' },
      { status: 400 },
    );
  }

  const period = { from: new Date(from), to: new Date(to) };
  const data = await analyticsService.getLLMCostStats(period, groupBy);
  return NextResponse.json<ApiResponse>({ success: true, data });
});
