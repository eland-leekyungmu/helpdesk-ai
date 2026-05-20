import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import { getAllConfigs, saveConfigs } from '@/services/config.service';
import type { ApiResponse, TokenPayload } from '@/shared/types';

/**
 * GET /api/admin/settings - 현재 설정 조회 (DB에서 읽기)
 */
export const GET = withRole(['admin'], async (_request: NextRequest, _payload: TokenPayload) => {
  const configs = await getAllConfigs();
  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      confidenceThreshold: parseFloat(configs.confidence_threshold),
      maxCategories: parseInt(configs.max_categories),
    },
  });
});

/**
 * PUT /api/admin/settings - 설정 변경 (DB에 저장, 5분 내 반영)
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
  }

  await saveConfigs({
    confidenceThreshold: body.confidenceThreshold,
    maxCategories: body.maxCategories,
  });

  const updated = await getAllConfigs();
  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      confidenceThreshold: parseFloat(updated.confidence_threshold),
      maxCategories: parseInt(updated.max_categories),
    },
  });
});
