import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import { analyticsService } from '@/services/analytics.service';
import type { ApiResponse, TokenPayload } from '@/shared/types';

/**
 * GET /api/analytics/kpi - KPI 통계 (1차 해결률, 분배 성공률, 처리 시간)
 */
export const GET = withRole(['admin', 'agent_l1'], async (request: NextRequest, _payload: TokenPayload) => {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'from, to 파라미터가 필요합니다.' },
      { status: 400 },
    );
  }

  const period = { from: new Date(from), to: new Date(to) };

  const [resolution, routing, processing] = await Promise.all([
    analyticsService.getResolutionRate(period),
    analyticsService.getRoutingAccuracy(period),
    analyticsService.getProcessingTime(period),
  ]);

  return NextResponse.json<ApiResponse>({
    success: true,
    data: { resolution, routing, processing },
  });
});
