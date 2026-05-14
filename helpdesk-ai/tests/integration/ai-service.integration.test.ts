/**
 * AI Service 통합 테스트
 * 
 * ⚠️ 실행 조건:
 * - AWS 자격 증명 설정 (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - BEDROCK_KB_ID 환경 변수 설정
 * - KB에 데이터가 적재되어 있어야 함
 * 
 * 실행: INTEGRATION=true npx vitest --run tests/integration/
 */

import { describe, it, expect, beforeAll } from 'vitest';
import 'dotenv/config';

// 통합 테스트는 INTEGRATION=true 일 때만 실행
const SKIP = process.env.INTEGRATION !== 'true';

describe.skipIf(SKIP)('AIService Integration Tests', () => {

  beforeAll(() => {
    if (!process.env.BEDROCK_KB_ID) {
      throw new Error('BEDROCK_KB_ID must be set for integration tests');
    }
  });

  describe('analyzeIntent', () => {
    it('VPN 관련 문의 → 인프라보안부서/네트워크팀 추정', async () => {
      const { analyzeIntent } = await import('@/services/ai.service');
      const { intentResult } = await analyzeIntent('VPN 접속이 안 됩니다. 재택근무 중인데 사내망에 연결이 안 돼요.');

      expect(intentResult.department).toBe('인프라보안부서');
      expect(intentResult.team).toBe('네트워크팀');
      expect(intentResult.categories).toContain('네트워크');
    }, 30000);

    it('이메일 관련 문의 → 시스템운영부서/그룹웨어팀 추정', async () => {
      const { analyzeIntent } = await import('@/services/ai.service');
      const { intentResult } = await analyzeIntent('아웃룩에서 메일 발송이 안 됩니다. 첨부파일 용량 제한이 있나요?');

      expect(intentResult.department).toBe('시스템운영부서');
      expect(intentResult.team).toBe('그룹웨어팀');
      expect(intentResult.categories).toContain('그룹웨어 (메일/캘린더/결재)');
    }, 30000);

    it('ERP 관련 문의 → IT개발부서 또는 시스템운영부서', async () => {
      const { analyzeIntent } = await import('@/services/ai.service');
      const { intentResult } = await analyzeIntent('SAP에서 전표 입력 시 오류가 발생합니다. 에러코드 FI-001');

      expect(['IT개발부서', '시스템운영부서']).toContain(intentResult.department);
      expect(intentResult.categories).toContain('ERP 시스템');
    }, 30000);
  });

  describe('generateAnswer', () => {
    it('텍스트 문의에 대해 답변 생성 (lightweight 모델)', async () => {
      const { generateAnswer } = await import('@/services/ai.service');
      const response = await generateAnswer(
        '00000000-0000-0000-0000-000000000001', // 테스트용 ticketId
        '비밀번호를 변경하고 싶습니다. 어떻게 하나요?',
      );

      expect(response.answer).toBeTruthy();
      expect(response.answer.length).toBeGreaterThan(10);
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
      expect(response.modelUsed).toContain('haiku');
      expect(response.intentResult.department).toBeTruthy();
    }, 60000);

    it('신뢰도 점수가 0~1 범위', async () => {
      const { generateAnswer } = await import('@/services/ai.service');
      const response = await generateAnswer(
        '00000000-0000-0000-0000-000000000002',
        '프린터 드라이버 설치 방법을 알려주세요',
      );

      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
    }, 60000);
  });

  describe('transformToPublic', () => {
    it('내부 호칭을 일반 호칭으로 변환', async () => {
      const { transformToPublic } = await import('@/services/ai.service');
      const { publicContent } = await transformToPublic(
        '김과장님, SAP에서 T-code SE38로 들어가셔서 프로그램을 실행하시면 됩니다. 이대리한테 권한 요청하세요.',
      );

      expect(publicContent).toBeTruthy();
      expect(publicContent.length).toBeGreaterThan(10);
      // 내부 호칭이 제거/변환되었는지 확인
      expect(publicContent).not.toContain('김과장님');
      expect(publicContent).not.toContain('이대리');
    }, 30000);

    it('내용(지시사항)은 보존', async () => {
      const { transformToPublic } = await import('@/services/ai.service');
      const { publicContent } = await transformToPublic(
        '박팀장님, 설정 > 네트워크 > VPN 프로필에서 재설정 버튼을 누르시면 됩니다.',
      );

      // 핵심 지시사항이 보존되는지 확인
      expect(publicContent).toMatch(/설정|네트워크|VPN|재설정/);
    }, 30000);
  });
});
