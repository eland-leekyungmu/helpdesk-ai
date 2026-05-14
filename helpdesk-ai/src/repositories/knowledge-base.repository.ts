// ============================================================
// Knowledge Base Entry Repository
// 소유 유닛: Unit 3 (AI/RAG)
// ============================================================

import { prisma } from '@/lib/prisma';
import { type SyntheticEntry } from '@/shared/types/ai';

export async function create(entry: {
  sourceType: 'real_data' | 'synthetic' | 'feedback';
  question: string;
  answer: string;
  category: string;
  isSynthetic: boolean;
  qualityScore?: number;
  sourceTicketId?: string;
}) {
  return prisma.knowledgeBaseEntry.create({ data: entry });
}

export async function createMany(entries: SyntheticEntry[], sourceType: 'synthetic' | 'real_data' = 'synthetic') {
  return prisma.knowledgeBaseEntry.createMany({
    data: entries.map((entry) => ({
      sourceType,
      question: entry.question,
      answer: entry.answer,
      category: entry.category,
      isSynthetic: sourceType === 'synthetic',
      qualityScore: entry.qualityScore ?? null,
    })),
  });
}

export async function findByCategory(category: string, limit = 50) {
  return prisma.knowledgeBaseEntry.findMany({
    where: { category },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateIndexedAt(ids: string[]) {
  return prisma.knowledgeBaseEntry.updateMany({
    where: { id: { in: ids } },
    data: { indexedAt: new Date() },
  });
}

export async function getStats() {
  const [total, synthetic, realData, feedback, indexed] = await Promise.all([
    prisma.knowledgeBaseEntry.count(),
    prisma.knowledgeBaseEntry.count({ where: { sourceType: 'synthetic' } }),
    prisma.knowledgeBaseEntry.count({ where: { sourceType: 'real_data' } }),
    prisma.knowledgeBaseEntry.count({ where: { sourceType: 'feedback' } }),
    prisma.knowledgeBaseEntry.count({ where: { indexedAt: { not: null } } }),
  ]);

  return { total, synthetic, realData, feedback, indexed };
}
