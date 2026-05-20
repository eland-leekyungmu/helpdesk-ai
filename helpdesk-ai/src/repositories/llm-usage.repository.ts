// ============================================================
// LLM Usage Log Repository
// 소유 유닛: Unit 3 (AI/RAG)
// ============================================================

import { prisma } from '@/lib/prisma';
import { type LLMUsageInput } from '@/shared/types/ai';

export async function createUsageLog(input: LLMUsageInput) {
  return prisma.llmUsageLog.create({
    data: {
      ticketId: input.ticketId || null,
      modelName: input.modelName,
      modelType: input.modelType,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      costUsd: input.costUsd,
      requestType: input.requestType,
      durationMs: input.durationMs,
    },
  });
}

export async function findByPeriod(startDate: Date, endDate: Date) {
  return prisma.llmUsageLog.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCostStats(
  startDate: Date,
  endDate: Date,
  groupBy: 'model' | 'day' | 'requestType' = 'model',
) {
  if (groupBy === 'model') {
    return prisma.llmUsageLog.groupBy({
      by: ['modelName'],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: true,
    });
  }

  if (groupBy === 'requestType') {
    return prisma.llmUsageLog.groupBy({
      by: ['requestType'],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: true,
    });
  }

  // groupBy === 'day' — raw query for daily aggregation
  return prisma.$queryRaw`
    SELECT
      DATE(created_at) as date,
      SUM(cost_usd) as total_cost,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      COUNT(*) as call_count
    FROM llm_usage_logs
    WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;
}
