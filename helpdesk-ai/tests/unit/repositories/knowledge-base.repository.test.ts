import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create, createMany, findByCategory } from '@/repositories/knowledge-base.repository';

const mockCreate = vi.fn().mockResolvedValue({ id: 'kb-1' });
const mockCreateMany = vi.fn().mockResolvedValue({ count: 3 });
const mockFindMany = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/prisma', () => ({
  prisma: {
    knowledgeBaseEntry: {
      create: (...args: unknown[]) => mockCreate(...args),
      createMany: (...args: unknown[]) => mockCreateMany(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

describe('knowledge-base.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create가 올바른 데이터로 호출', async () => {
    await create({
      sourceType: 'synthetic',
      question: 'VPN 접속 방법',
      answer: '설정에서 프로필을 추가하세요',
      category: '네트워크',
      isSynthetic: true,
      qualityScore: 0.85,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        sourceType: 'synthetic',
        question: 'VPN 접속 방법',
        answer: '설정에서 프로필을 추가하세요',
        category: '네트워크',
        isSynthetic: true,
        qualityScore: 0.85,
      },
    });
  });

  it('createMany가 배치 데이터를 올바르게 변환', async () => {
    const entries = [
      { question: 'Q1', answer: 'A1', category: '네트워크', department: '인프라보안부서', team: '네트워크팀' },
      { question: 'Q2', answer: 'A2', category: 'ERP 시스템', department: 'IT개발부서', team: 'ERP팀' },
    ];

    await createMany(entries, 'synthetic');

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { sourceType: 'synthetic', question: 'Q1', answer: 'A1', category: '네트워크', isSynthetic: true, qualityScore: null },
        { sourceType: 'synthetic', question: 'Q2', answer: 'A2', category: 'ERP 시스템', isSynthetic: true, qualityScore: null },
      ],
    });
  });

  it('findByCategory가 카테고리 필터와 limit 적용', async () => {
    await findByCategory('네트워크', 20);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { category: '네트워크' },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  });
});
