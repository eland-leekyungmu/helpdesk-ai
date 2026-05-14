#!/usr/bin/env ts-node
/**
 * 시드 데이터 생성 v2 - 실제 티켓 패턴 기반
 * 실행: npx tsx scripts/data-pipeline/generate-seed-v2.ts
 */

import 'dotenv/config';
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { invokeModel, calculateCost } from '../../src/lib/bedrock';
import { logUsage } from '../../src/services/ai.service';
import { ORGANIZATION_STRUCTURE } from '../../src/shared/constants/categories';

interface KBEntry {
  question: string;
  answer: string;
  category: string;
  department: string;
  team: string;
  tags: string[];
  subject: string;
}

// 카테고리별 실제 업무 컨텍스트
const CATEGORY_CONTEXTS: Array<{
  category: string;
  department: string;
  team: string;
  context: string;
  exampleTopics: string[];
}> = [
  {
    category: 'ERP 시스템',
    department: 'IT개발부서',
    team: 'ERP팀',
    context: '이랜드 그룹 SAP ERP 시스템 관련 문의. 전표 처리, 재고 관리, 엑셀 업로드, T-code 오류, 마스터 데이터 설정 등',
    exampleTopics: ['전표 생성 오류', '엑셀 업로드 실패', '재고 실사 등록 오류', 'ABAP 실행 오류', '마스터 데이터 설정 변경', '발주 시스템 오류'],
  },
  {
    category: 'CRM 시스템',
    department: 'IT개발부서',
    team: 'CRM팀',
    context: '이랜드 EIMS CRM 시스템 관련 문의. 회원 포인트, 문자 발송, 고객 정보 조회, 광고성 문자 차단 등',
    exampleTopics: ['문자 발송 내역 확인', '고객 포인트 조회 오류', '광고성 문자 차단 방법', '회원 정보 수정', 'EIMS 로그인 불가'],
  },
  {
    category: '클라우드 인프라',
    department: '인프라보안부서',
    team: '클라우드팀',
    context: 'AWS/클라우드 인프라 관련 문의. 서버 접속, 리소스 확장, 배포 오류, 클라우드 서비스 설정 등',
    exampleTopics: ['서버 접속 불가', 'EC2 인스턴스 재시작 요청', '배포 파이프라인 오류', 'S3 권한 설정', 'RDS 접속 문제'],
  },
  {
    category: '네트워크',
    department: '인프라보안부서',
    team: '네트워크팀',
    context: '사내 네트워크, VPN, 와이파이 관련 문의. VPN 접속 오류, 네트워크 속도 저하, 방화벽 정책 등',
    exampleTopics: ['VPN 접속 안됨', '와이파이 연결 불가', '네트워크 속도 느림', '특정 사이트 접속 차단', '재택근무 VPN 설정'],
  },
  {
    category: 'IT 인프라 (서버/스토리지)',
    department: '인프라보안부서',
    team: '정보인프라팀',
    context: 'PC, 서버, 프린터, 도메인 연결 등 IT 인프라 관련 문의. 도메인 트러스트 오류, PC 계정 문제, 프린터 설정 등',
    exampleTopics: ['도메인 연결 오류', 'PC 계정 잠김', '프린터 연결 안됨', '공유 폴더 접근 불가', '노트북 도메인 재가입'],
  },
  {
    category: '정보보안',
    department: '인프라보안부서',
    team: '정보보안팀',
    context: 'VPN 계정, 문서보안(DRM), 보안 정책 관련 문의. 계정 잠금 해제, 보안 프로그램 오류, 외부 반출 승인 등',
    exampleTopics: ['VPN 계정 잠김', '문서보안 해제 요청', '보안 프로그램 충돌', 'USB 사용 승인', '외부 메일 발송 차단'],
  },
  {
    category: '그룹웨어 (메일/캘린더/결재)',
    department: '시스템운영부서',
    team: '그룹웨어팀',
    context: '이메일, 그룹메일, 전자결재, 캘린더 관련 문의. 그룹메일 수신자 변경, 메일 용량 초과, 결재선 설정 등',
    exampleTopics: ['그룹메일 수신자 삭제/추가', '메일 수신 안됨', '전자결재 오류', '캘린더 공유 설정', '메일 용량 초과'],
  },
  {
    category: 'SCM (공급망)',
    department: '시스템운영부서',
    team: 'SCM팀',
    context: '공급망 관리 시스템 관련 문의. 발주, 입고, 물류, 배송 추적 시스템 오류 등',
    exampleTopics: ['발주 시스템 오류', '입고 확인 불가', '물류 추적 안됨', '거래처 등록 요청', '배송 상태 조회 오류'],
  },
  {
    category: 'FCM (매장관리)',
    department: '시스템운영부서',
    team: 'FCM팀',
    context: '매장 POS, 샵링크, 이네스 등 매장 관리 시스템 관련 문의. 결제 오류, 텍스프리, 매니저 등록, 매장 환경설정 등',
    exampleTopics: ['샵링크 결제 오류', '텍스프리 발급 불가', '이네스 비밀번호 변경', '매니저 등록/변경', 'POS 프로그램 오류'],
  },
  {
    category: '계정/권한 관리',
    department: '시스템운영부서',
    team: '그룹웨어팀',
    context: '각종 시스템 로그인, 비밀번호 초기화, 권한 요청 관련 문의. 이네스/EDI/이오피스/flink 등 계정 문제',
    exampleTopics: ['비밀번호 초기화 요청', '계정 잠금 해제', '시스템 접근 권한 요청', '퇴직자 계정 삭제', '신규 입사자 계정 생성'],
  },
  {
    category: '데이터/분석 플랫폼',
    department: '데이터플랫폼부서',
    team: '데이터플랫폼팀',
    context: '데이터 분석 플랫폼, 데이터 추출, 리포트 관련 문의',
    exampleTopics: ['데이터 추출 요청', '분석 플랫폼 접속 오류', '데이터 정합성 문의', '배치 작업 실패', 'ETL 오류'],
  },
  {
    category: 'BI/리포트',
    department: '데이터플랫폼부서',
    team: 'BI팀',
    context: 'SAP BI, 경영정보 리포트, 대시보드 관련 문의. BI 실행 오류, 리포트 조회 불가, 권한 요청 등',
    exampleTopics: ['BI 실행 오류', '리포트 조회 안됨', 'BI 권한 요청', '대시보드 데이터 불일치', 'BI 설치 오류'],
  },
];

async function generateSeedV2() {
  console.log('=== 시드 데이터 생성 v2 (실제 티켓 패턴 기반) ===\n');

  const allEntries: KBEntry[] = [];
  const entriesPerCategory = 5; // 테스트용 5건씩

  for (const ctx of CATEGORY_CONTEXTS) {
    console.log(`[${ctx.category}] 생성 중... (${entriesPerCategory}건)`);

    const prompt = buildPrompt(ctx, entriesPerCategory);

    try {
      const response = await invokeModel({
        prompt,
        modelType: 'lightweight',
        maxTokens: 8192,
        temperature: 0.7,
      });

      await logUsage({
        modelName: response.modelId,
        modelType: 'lightweight',
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costUsd: calculateCost(response.modelId, response.inputTokens, response.outputTokens),
        requestType: 'seed_generation',
        durationMs: response.durationMs,
      });

      const entries = parseResponse(response.content, ctx);
      allEntries.push(...entries);
      console.log(`  → ${entries.length}건 생성 완료`);
    } catch (error) {
      console.error(`  → 실패:`, error instanceof Error ? error.message : error);
    }
  }

  // 저장
  const outputDir = resolve(__dirname, '../../data');
  await mkdir(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, 'seed-data-v2.json');
  await writeFile(outputPath, JSON.stringify(allEntries, null, 2), 'utf-8');

  console.log(`\n=== 완료: ${allEntries.length}건 → ${outputPath} ===`);
}

function buildPrompt(
  ctx: typeof CATEGORY_CONTEXTS[number],
  count: number,
): string {
  return `당신은 이랜드 그룹 IT Help Desk의 실제 티켓 데이터를 생성하는 전문가입니다.

[배경]
- 이랜드 그룹은 패션, 유통, 외식, 레저 등 다양한 사업을 운영하는 대기업입니다
- IT Help Desk에는 임직원과 매장 직원들이 IT 관련 문의를 접수합니다
- 1차 처리자(서비스데스크)가 접수 후, 필요시 2차 처리자(전문 담당팀)에게 확인 요청합니다

[생성 조건]
- 카테고리: ${ctx.category}
- 담당 부서: ${ctx.department}
- 담당 팀: ${ctx.team}
- 업무 컨텍스트: ${ctx.context}
- 관련 주제 예시: ${ctx.exampleTopics.join(', ')}

[데이터 형식]
각 항목은 실제 티켓의 "질문(요청자 문의)"과 "답변(최종 요청자에게 전달된 답변)"으로 구성됩니다.

규칙:
1. question: 요청자가 실제로 작성할 법한 자연스러운 문의 (구어체 OK, 오타 약간 OK)
2. answer: 1차 처리자가 요청자에게 전달하는 최종 답변 (정중하고 구체적인 안내)
3. subject: 티켓 제목 (간결하게)
4. tags: 관련 태그 2~4개
5. 각 항목은 서로 다른 상황/시나리오여야 함
6. 이랜드 그룹의 실제 시스템명(이네스, 샵링크, flink, 이오피스, SAP, EIMS 등)을 자연스럽게 사용

${count}건을 아래 JSON 배열로만 응답하세요:
[
  {
    "subject": "티켓 제목",
    "question": "요청자 문의 내용",
    "answer": "최종 답변 내용",
    "tags": ["태그1", "태그2"]
  }
]`;
}

function parseResponse(content: string, ctx: typeof CATEGORY_CONTEXTS[number]): KBEntry[] {
  try {
    const cleaned = content.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: { question?: string; answer?: string }) => item.question && item.answer)
      .map((item: { subject?: string; question: string; answer: string; tags?: string[] }) => ({
        subject: item.subject || '',
        question: item.question,
        answer: item.answer,
        category: ctx.category,
        department: ctx.department,
        team: ctx.team,
        tags: item.tags || [],
      }));
  } catch {
    return [];
  }
}

generateSeedV2().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
