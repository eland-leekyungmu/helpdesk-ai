// ============================================================
// POST /api/ai/transform-to-public
// 2차 처리자 Private 답변 → Public 변환
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { transformToPublic, logUsage } from '@/services/ai.service';
import { calculateCost } from '@/lib/bedrock';
import { z } from 'zod';

const requestSchema = z.object({
  privateContent: z.string().min(1).max(10000),
  ticketId: z.string().uuid().optional(),
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

    const { privateContent, ticketId } = parsed.data;
    const { publicContent, usage } = await transformToPublic(privateContent);

    // 사용 로그 저장
    if (usage.inputTokens > 0) {
      await logUsage({
        ticketId,
        modelName: usage.modelId,
        modelType: 'lightweight',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: calculateCost(usage.modelId, usage.inputTokens, usage.outputTokens),
        requestType: 'public_transform',
        durationMs: usage.durationMs,
      });
    }

    return NextResponse.json({
      publicContent,
      usage: {
        modelId: usage.modelId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        durationMs: usage.durationMs,
      },
    });
  } catch (error) {
    console.error('[API] /api/ai/transform-to-public error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
