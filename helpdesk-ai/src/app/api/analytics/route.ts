import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import { analyticsService } from '@/services/analytics.service';
import type { ApiResponse, TokenPayload } from '@/shared/types';

/**
 * GET /api/analytics?type=resolution|routing|processing|cost|tickets|departments&from=&to=&groupBy=
 */
export const GET = withRole(['admin', 'agent_l1'], async (request: NextRequest, _payload: TokenPayload) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const groupBy = (searchParams.get('groupBy') || 'model') as 'model' | 'day' | 'week';

  if (!type || !from || !to) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'type, from, to 파라미터가 필요합니다.' },
      { status: 400 },
    );
  }

  const period = { from: new Date(from), to: new Date(to) };

  let data: unknown;

  switch (type) {
    case 'resolution':
      data = await analyticsService.getResolutionRate(period);
      break;
    case 'routing':
      data = await analyticsService.getRoutingAccuracy(period);
      break;
    case 'processing':
      data = await analyticsService.getProcessingTime(period);
      break;
    case 'cost':
      data = await analyticsService.getLLMCostStats(period, groupBy);
      break;
    case 'tickets':
      data = await analyticsService.getTicketStats(period);
      break;
    case 'departments':
      data = await analyticsService.getDepartmentStats(period);
      break;
    default:
      return NextResponse.json<ApiResponse>(
        { success: false, error: '유효하지 않은 type입니다.' },
        { status: 400 },
      );
  }

  return NextResponse.json<ApiResponse>({ success: true, data });
});
