// ============================================================
// POST /api/ai/validate-and-load
// 합성 데이터 품질 검증 + KB 적재
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateQuality, loadToKB } from '@/services/data-pipeline.service';
import { type SyntheticEntry } from '@/shared/types/ai';
import { z } from 'zod';

const entrySchema = z.object({
  question: z.string(),
  answer: z.string(),
  category: z.string(),
  department: z.string(),
  team: z.string(),
  qualityScore: z.number().optional(),
});

const requestSchema = z.object({
  entries: z.array(entrySchema).min(1),
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

    const entries = parsed.data.entries as SyntheticEntry[];

    // 품질 검증
    const validationResult = validateQuality(entries);

    // KB 적재
    const loadResult = await loadToKB(validationResult.entries);

    return NextResponse.json({
      validation: {
        totalInput: validationResult.totalInput,
        passed: validationResult.passed,
        duplicatesRemoved: validationResult.duplicatesRemoved,
        invalidFormat: validationResult.invalidFormat,
      },
      load: {
        totalLoaded: loadResult.totalLoaded,
        failed: loadResult.failed,
        errors: loadResult.errors,
      },
    });
  } catch (error) {
    console.error('[API] /api/ai/validate-and-load error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
