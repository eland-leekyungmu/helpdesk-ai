// ============================================================
// POST /api/ai/generate-answer
// 문의에 대한 AI 답변 생성 (Unit 2에서 호출)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateAnswer, determineRouting } from '@/services/ai.service';
import { type Attachment } from '@/shared/types/ai';
import { z } from 'zod';

const requestSchema = z.object({
  ticketId: z.string().uuid(),
  question: z.string().min(1).max(5000),
  attachments: z.array(z.object({
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
    url: z.string(),
  })).optional(),
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

    const { ticketId, question, attachments } = parsed.data;

    const aiResponse = await generateAnswer(
      ticketId,
      question,
      attachments as Attachment[] | undefined,
    );

    // 라우팅 판정
    const routing = await determineRouting(
      aiResponse.confidence,
      [], // ragResults는 generateAnswer 내부에서 이미 사용됨
      aiResponse.intentResult,
      aiResponse.answer,
    );

    return NextResponse.json({
      answer: aiResponse.answer,
      confidence: aiResponse.confidence,
      sources: aiResponse.sources,
      modelUsed: aiResponse.modelUsed,
      tokensUsed: aiResponse.tokensUsed,
      intentResult: aiResponse.intentResult,
      routing,
    });
  } catch (error) {
    console.error('[API] /api/ai/generate-answer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
