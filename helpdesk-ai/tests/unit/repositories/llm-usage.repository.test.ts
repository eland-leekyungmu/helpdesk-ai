import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUsageLog } from '@/repositories/llm-usage.repository';
import type { LLMUsageInput } from '@/shared/types/ai';

const mockCreate = vi.fn().mockResolvedValue({ id: 'test-id' });

vi.mock('@/lib/prisma', () => ({
  prisma: {
    llmUsageLog: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

describe('llm-usage.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createUsageLog가 올바른 데이터로 prisma.create 호출', async () => {
    const input: LLMUsageInput = {
      ticketId: 'ticket-123',
      modelName: 'anthropic.claude-3-haiku-20240307-v1:0',
      modelType: 'lightweight',
      inputTokens: 500,
      outputTokens: 200,
      costUsd: 0.00038,
      requestType: 'answer_gen',
      durationMs: 1200,
    };

    await createUsageLog(input);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        ticketId: 'ticket-123',
        modelName: 'anthropic.claude-3-haiku-20240307-v1:0',
        modelType: 'lightweight',
        inputTokens: 500,
        outputTokens: 200,
        costUsd: 0.00038,
        requestType: 'answer_gen',
        durationMs: 1200,
      },
    });
  });

  it('ticketId가 없으면 null로 저장', async () => {
    const input: LLMUsageInput = {
      modelName: 'anthropic.claude-3-haiku-20240307-v1:0',
      modelType: 'lightweight',
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.0001,
      requestType: 'synthesis',
      durationMs: 800,
    };

    await createUsageLog(input);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ticketId: null }),
    });
  });
});
