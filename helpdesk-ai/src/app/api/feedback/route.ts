import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/shared/middleware/auth';
import { feedbackService } from '@/services/feedback.service';
import type { ApiResponse, SubmitFeedbackInput, TokenPayload } from '@/shared/types';

/**
 * GET /api/feedback?messageId= - 피드백 목록 조회
 */
export const GET = withAuth(async (request: NextRequest, _payload: TokenPayload) => {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId') || undefined;
  const feedbacks = await feedbackService.getFeedbacks(messageId);
  return NextResponse.json<ApiResponse>({ success: true, data: feedbacks });
});

/**
 * POST /api/feedback - 피드백 제출
 */
export const POST = withAuth(async (request: NextRequest, payload: TokenPayload) => {
  try {
    const body = (await request.json()) as Omit<SubmitFeedbackInput, 'userId'>;

    if (!body.messageId || !body.rating) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'messageId와 rating을 입력하세요.' },
        { status: 400 },
      );
    }

    if (!['positive', 'negative'].includes(body.rating)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'rating은 positive 또는 negative여야 합니다.' },
        { status: 400 },
      );
    }

    const feedback = await feedbackService.submitFeedback({
      messageId: body.messageId,
      userId: payload.userId,
      rating: body.rating,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: feedback }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '피드백 제출 실패';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 400 });
  }
});
