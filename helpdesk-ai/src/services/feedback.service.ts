import { prisma } from '@/lib/prisma';
import type { SubmitFeedbackInput, ReindexStatus } from '@/shared/types';
import type { Feedback } from '@prisma/client';

export class FeedbackService {
  /**
   * 피드백 제출 (👍/👎)
   */
  async submitFeedback(input: SubmitFeedbackInput): Promise<Feedback> {
    // 중복 피드백 방지 (upsert)
    return prisma.feedback.upsert({
      where: {
        messageId_userId: {
          messageId: input.messageId,
          userId: input.userId,
        },
      },
      update: { rating: input.rating },
      create: {
        messageId: input.messageId,
        userId: input.userId,
        rating: input.rating,
      },
    });
  }

  /**
   * 티켓 완료 시 학습 데이터 누적
   * resolved 티켓의 질문-답변 쌍을 KB 엔트리로 저장
   */
  async accumulateLearningData(ticketId: string): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          where: { visibility: 'public' },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket || ticket.status !== 'resolved') return;

    // 첫 번째 메시지 = 질문, 마지막 public 메시지 = 답변
    const question = ticket.messages[0]?.content;
    const answer = ticket.messages[ticket.messages.length - 1]?.content;

    if (!question || !answer || ticket.messages.length < 2) return;

    // 이미 등록된 건 스킵
    const existing = await prisma.knowledgeBaseEntry.findFirst({
      where: { sourceTicketId: ticketId },
    });
    if (existing) return;

    const category = Array.isArray(ticket.category)
      ? (ticket.category as string[])[0] || '미분류'
      : '미분류';

    await prisma.knowledgeBaseEntry.create({
      data: {
        sourceType: 'real_data',
        question,
        answer,
        category,
        isSynthetic: false,
        sourceTicketId: ticketId,
      },
    });
  }

  /**
   * KB 재색인 트리거
   */
  async triggerReindex(): Promise<ReindexStatus> {
    // 아직 색인되지 않은 엔트리 수 확인
    const unindexed = await prisma.knowledgeBaseEntry.count({
      where: { indexedAt: null },
    });

    if (unindexed === 0) {
      return { status: 'already_running', entriesQueued: 0 };
    }

    // 색인 시간 업데이트 (실제로는 Bedrock KB sync API 호출)
    await prisma.knowledgeBaseEntry.updateMany({
      where: { indexedAt: null },
      data: { indexedAt: new Date() },
    });

    return { status: 'triggered', entriesQueued: unindexed };
  }

  /**
   * 피드백 목록 조회
   */
  async getFeedbacks(messageId?: string): Promise<Feedback[]> {
    const where = messageId ? { messageId } : {};
    return prisma.feedback.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const feedbackService = new FeedbackService();
