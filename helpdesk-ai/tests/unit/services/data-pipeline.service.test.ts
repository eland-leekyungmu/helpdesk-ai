import { describe, it, expect, vi } from 'vitest';
import { validateQuality } from '@/services/data-pipeline.service';
import type { SyntheticEntry } from '@/shared/types/ai';

vi.mock('@/lib/bedrock', () => ({
  invokeModel: vi.fn(),
  calculateCost: vi.fn().mockReturnValue(0.001),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    llmUsageLog: { create: vi.fn().mockResolvedValue({}) },
    knowledgeBaseEntry: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
  },
}));

// ─── validateQuality ────────────────────────────────────────

describe('validateQuality', () => {
  it('유효한 엔트리는 통과', () => {
    const entries: SyntheticEntry[] = [
      { question: 'VPN 접속 안됨', answer: '설정을 확인하세요', category: '네트워크', department: '인프라보안부서', team: '네트워크팀' },
    ];
    const result = validateQuality(entries);
    expect(result.passed).toBe(1);
    expect(result.duplicatesRemoved).toBe(0);
    expect(result.invalidFormat).toBe(0);
  });

  it('필수 필드 누락 시 invalidFormat 증가', () => {
    const entries: SyntheticEntry[] = [
      { question: '', answer: '답변', category: '네트워크', department: '인프라보안부서', team: '네트워크팀' },
      { question: '질문', answer: '', category: '네트워크', department: '인프라보안부서', team: '네트워크팀' },
      { question: '질문', answer: '답변', category: '', department: '인프라보안부서', team: '네트워크팀' },
      { question: '질문', answer: '답변', category: '네트워크', department: '', team: '네트워크팀' },
      { question: '질문', answer: '답변', category: '네트워크', department: '인프라보안부서', team: '' },
    ];
    const result = validateQuality(entries);
    expect(result.invalidFormat).toBe(5);
    expect(result.passed).toBe(0);
  });

  it('유효하지 않은 카테고리는 invalidFormat', () => {
    const entries: SyntheticEntry[] = [
      { question: '질문', answer: '답변', category: '존재하지않는카테고리', department: '인프라보안부서', team: '네트워크팀' },
    ];
    const result = validateQuality(entries);
    expect(result.invalidFormat).toBe(1);
    expect(result.passed).toBe(0);
  });

  it('중복 질문 제거', () => {
    const entries: SyntheticEntry[] = [
      { question: 'VPN 접속이 안됩니다', answer: '답변1', category: '네트워크', department: '인프라보안부서', team: '네트워크팀' },
      { question: 'VPN 접속이 안됩니다', answer: '답변2', category: '네트워크', department: '인프라보안부서', team: '네트워크팀' },
      { question: 'vpn 접속이 안됩니다', answer: '답변3', category: '네트워크', department: '인프라보안부서', team: '네트워크팀' },
    ];
    const result = validateQuality(entries);
    expect(result.passed).toBe(1);
    expect(result.duplicatesRemoved).toBe(2);
  });

  it('공백 차이만 있는 중복도 제거', () => {
    const entries: SyntheticEntry[] = [
      { question: '이메일 발송 오류', answer: '답변1', category: '그룹웨어 (메일/캘린더/결재)', department: '시스템운영부서', team: '그룹웨어팀' },
      { question: '이메일  발송  오류', answer: '답변2', category: '그룹웨어 (메일/캘린더/결재)', department: '시스템운영부서', team: '그룹웨어팀' },
    ];
    const result = validateQuality(entries);
    expect(result.passed).toBe(1);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it('대량 데이터 처리', () => {
    const entries: SyntheticEntry[] = Array.from({ length: 1000 }, (_, i) => ({
      question: `질문 ${i}`,
      answer: `답변 ${i}`,
      category: '네트워크',
      department: '인프라보안부서',
      team: '네트워크팀',
    }));
    const result = validateQuality(entries);
    expect(result.passed).toBe(1000);
    expect(result.totalInput).toBe(1000);
  });
});
