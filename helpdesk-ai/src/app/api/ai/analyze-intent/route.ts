// ============================================================
// POST /api/ai/analyze-intent
// 문의 의도 분석 (department, team, categories 추정)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { analyzeIntent } from '@/services/ai.service';
import { z } from 'zod';

const requestSchema = z.object({
  question: z.string().min(1).max(5000),
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

    const { intentResult, usage } = await analyzeIntent(parsed.data.question);

    return NextResponse.json({
      intentResult,
      usage: {
        modelId: usage.modelId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        durationMs: usage.durationMs,
      },
    });
  } catch (error) {
    console.error('[API] /api/ai/analyze-intent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
