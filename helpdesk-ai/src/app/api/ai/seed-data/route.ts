// ============================================================
// POST /api/ai/seed-data
// 시드 데이터 생성 (테스트/개발용)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateSeedData } from '@/services/data-pipeline.service';
import { z } from 'zod';

const requestSchema = z.object({
  entriesPerCategory: z.number().min(1).max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const entries = await generateSeedData({
      entriesPerCategory: parsed.data.entriesPerCategory,
    });

    return NextResponse.json({
      totalGenerated: entries.length,
      entries,
    });
  } catch (error) {
    console.error('[API] /api/ai/seed-data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
