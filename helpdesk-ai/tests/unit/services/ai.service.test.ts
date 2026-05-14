import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeToModel, assessConfidence } from '@/services/ai.service';
import type { RAGResult, Attachment } from '@/shared/types/ai';

// ─── Bedrock SDK mock ───────────────────────────────────────

vi.mock('@/lib/bedrock', () => ({
  invokeModel: vi.fn().mockResolvedValue({
    content: '{"department":"인프라보안부서","team":"네트워크팀","categories":["네트워크"]}',
    inputTokens: 100,
    outputTokens: 50,
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    durationMs: 500,
  }),
  retrieveFromKB: vi.fn().mockResolvedValue([]),
  calculateCost: vi.fn().mockReturnValue(0.001),
  getModelId: vi.fn().mockReturnValue('anthropic.claude-3-haiku-20240307-v1:0'),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    llmUsageLog: { create: vi.fn().mockResolvedValue({}) },
    user: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

// ─── routeToModel ───────────────────────────────────────────

describe('routeToModel', () => {
  it('텍스트만 입력 시 lightweight 반환', () => {
    expect(routeToModel(undefined)).toBe('lightweight');
    expect(routeToModel([])).toBe('lightweight');
  });

  it('첨부파일 있으면 heavy 반환', () => {
    const attachments: Attachment[] = [
      { filename: 'screenshot.png', mimeType: 'image/png', size: 1024, url: '/files/1' },
    ];
    expect(routeToModel(attachments)).toBe('heavy');
  });

  it('PDF 첨부도 heavy 반환', () => {
    const attachments: Attachment[] = [
      { filename: 'doc.pdf', mimeType: 'application/pdf', size: 2048, url: '/files/2' },
    ];
    expect(routeToModel(attachments)).toBe('heavy');
  });

  it('엑셀 첨부도 heavy 반환', () => {
    const attachments: Attachment[] = [
      { filename: 'data.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 4096, url: '/files/3' },
    ];
    expect(routeToModel(attachments)).toBe('heavy');
  });
});

// ─── assessConfidence ───────────────────────────────────────

describe('assessConfidence', () => {
  it('빈 배열이면 0 반환', () => {
    expect(assessConfidence([])).toBe(0);
  });

  it('단일 결과의 score 반환', () => {
    const results: RAGResult[] = [
      { content: 'test', score: 0.85, sourceId: '1', metadata: { category: '', sourceType: '', department: '', team: '' } },
    ];
    expect(assessConfidence(results)).toBe(0.85);
  });

  it('여러 결과의 평균 score 반환', () => {
    const results: RAGResult[] = [
      { content: 'a', score: 0.9, sourceId: '1', metadata: { category: '', sourceType: '', department: '', team: '' } },
      { content: 'b', score: 0.8, sourceId: '2', metadata: { category: '', sourceType: '', department: '', team: '' } },
      { content: 'c', score: 0.7, sourceId: '3', metadata: { category: '', sourceType: '', department: '', team: '' } },
    ];
    expect(assessConfidence(results)).toBeCloseTo(0.8, 5);
  });

  it('10건 결과의 평균 계산', () => {
    const results: RAGResult[] = Array.from({ length: 10 }, (_, i) => ({
      content: `item-${i}`,
      score: 0.5 + i * 0.05,
      sourceId: String(i),
      metadata: { category: '', sourceType: '', department: '', team: '' },
    }));
    const expected = results.reduce((sum, r) => sum + r.score, 0) / 10;
    expect(assessConfidence(results)).toBeCloseTo(expected, 5);
  });
});
