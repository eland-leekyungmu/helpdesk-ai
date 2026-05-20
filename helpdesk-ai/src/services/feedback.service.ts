import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { BedrockAgentClient, ListDataSourcesCommand, StartIngestionJobCommand } from '@aws-sdk/client-bedrock-agent';
import type { SubmitFeedbackInput, ReindexStatus } from '@/shared/types';
import type { Feedback } from '@prisma/client';

const S3_BUCKET = process.env.KB_S3_BUCKET || 'helpdesk-ai-kb-docs-dev';
const KB_ID = process.env.BEDROCK_KB_ID || 'FNZWM9CGC2';
const REGION = process.env.AWS_REGION || 'ap-northeast-2';

export class FeedbackService {
  /**
   * 피드백 제출 (👍/👎)
   * 피드백 제출 시 해당 티켓을 closed 상태로 변경
   */
  async submitFeedback(input: SubmitFeedbackInput): Promise<Feedback> {
    // 중복 피드백 방지 (upsert)
    const feedback = await prisma.feedback.upsert({
      where: {
        messageId_userId: {
          messageId: input.messageId,
          userId: input.userId!,
        },
      },
      update: { rating: input.rating },
      create: {
        messageId: input.messageId,
        userId: input.userId!,
        rating: input.rating,
      },
    });

    // 피드백 대상 메시지의 티켓을 closed로 변경
    const message = await prisma.message.findUnique({
      where: { id: input.messageId },
      select: { ticketId: true },
    });

    if (message?.ticketId) {
      await prisma.ticket.update({
        where: {
          id: message.ticketId,
          status: { in: ['resolved', 'open', 'in_progress'] },
        },
        data: { status: 'closed' },
      }).catch(() => {});

      // 👍 긍정 피드백인 경우에만 KB 엔트리 적재
      if (input.rating === 'positive') {
        await this.accumulateLearningData(message.ticketId);
      }
    }

    return feedback;
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
   * 1. DB의 미색인 엔트리를 S3에 업로드
   * 2. Bedrock KB Ingestion Job 시작
   */
  async triggerReindex(): Promise<ReindexStatus> {
    // 아직 색인되지 않은 엔트리 조회
    const unindexedEntries = await prisma.knowledgeBaseEntry.findMany({
      where: { indexedAt: null },
    });

    if (unindexedEntries.length === 0) {
      return { status: 'no_new_entries', entriesQueued: 0 };
    }

    const s3 = new S3Client({ region: REGION });
    let uploaded = 0;

    // 1. 각 엔트리를 S3에 텍스트 파일로 업로드
    for (const entry of unindexedEntries) {
      const docContent = [
        `[질문]\n${entry.question}`,
        `[답변]\n${entry.answer}`,
      ].join('\n\n');

      const metadata = {
        metadataAttributes: {
          category: entry.category,
          source_type: entry.sourceType,
          is_synthetic: String(entry.isSynthetic),
        },
      };

      const key = `tickets/kb-entry-${entry.id}.txt`;
      const metaKey = `tickets/kb-entry-${entry.id}.txt.metadata.json`;

      try {
        await s3.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: docContent,
          ContentType: 'text/plain; charset=utf-8',
        }));
        await s3.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: metaKey,
          Body: JSON.stringify(metadata),
          ContentType: 'application/json',
        }));
        uploaded++;
      } catch (e) {
        console.error(`S3 업로드 실패 (${entry.id}):`, e);
      }
    }

    // 2. Bedrock KB Ingestion Job 시작
    let ingestionJobId: string | undefined;
    try {
      const bedrockAgent = new BedrockAgentClient({ region: REGION });
      const listResp = await bedrockAgent.send(new ListDataSourcesCommand({ knowledgeBaseId: KB_ID }));
      const dataSources = listResp.dataSourceSummaries || [];

      if (dataSources.length > 0) {
        const dsId = dataSources[0].dataSourceId!;
        const syncResp = await bedrockAgent.send(new StartIngestionJobCommand({
          knowledgeBaseId: KB_ID,
          dataSourceId: dsId,
        }));
        ingestionJobId = syncResp.ingestionJob?.ingestionJobId;
      }
    } catch (e) {
      console.error('Bedrock Ingestion 실패:', e);
    }

    // 3. DB에 색인 시간 업데이트
    await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: unindexedEntries.map(e => e.id) } },
      data: { indexedAt: new Date() },
    });

    return {
      status: 'triggered',
      entriesQueued: uploaded,
      message: ingestionJobId
        ? `Ingestion Job 시작됨 (${ingestionJobId}). 완료까지 1~2분 소요됩니다.`
        : `S3 업로드 완료 (${uploaded}건). Bedrock Ingestion은 수동으로 확인하세요.`,
    };
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
