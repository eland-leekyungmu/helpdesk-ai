import 'dotenv/config';
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { invokeModel } from '../../src/lib/bedrock';
import seedUsers from '../../data/seed-users.json';
import { CATEGORY_TEAM_MAP } from '../../src/shared/constants/categories';

interface KBEntry {
  subject: string;
  question: string;
  internal_note: string | null;
  l2_response: string | null;
  answer: string;
  category: string;
  department: string;
  team: string;
  tags: string[];
  resolution_type: string;
  requester: { name: string; email: string; company: string };
  agent_l1: { name: string; email: string };
  agent_l2: { name: string; email: string; department: string; team: string } | null;
}

const CATEGORIES_WITH_CONTEXT = [
  { category: 'ERP 시스템', context: 'SAP ERP 전표, 재고, 발주, 엑셀 업로드, T-code 오류' },
  { category: 'CRM 시스템', context: 'EIMS CRM 회원 포인트, 문자 발송, 고객 정보' },
  { category: '클라우드 인프라', context: 'AWS 서버, 배포, 리소스 확장' },
  { category: '네트워크', context: 'VPN, 와이파이, 네트워크 속도, 방화벽' },
  { category: 'IT 인프라 (서버/스토리지)', context: 'PC, 도메인, 프린터, 공유폴더' },
  { category: '정보보안', context: 'VPN 계정, 문서보안(DRM), USB, 외부 반출' },
  { category: '그룹웨어 (메일/캘린더/결재)', context: '이메일, 그룹메일, 전자결재, 캘린더' },
  { category: 'SCM (공급망)', context: '발주, 입고, 물류, 배송 추적' },
  { category: 'FCM (매장관리)', context: '샵링크, 이네스, POS, 텍스프리, 매니저 등록' },
  { category: '계정/권한 관리', context: '비밀번호 초기화, 계정 잠금, 권한 요청' },
  { category: 'BI/리포트', context: 'SAP BI, 경영정보 리포트, 대시보드' },
  { category: '데이터/분석 플랫폼', context: '데이터 추출, 분석 플랫폼, ETL' },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickScenario(): string {
  const r = Math.random();
  if (r < 0.50) return 'l1_resolved';
  if (r < 0.90) return 'l2_resolved';
  return 'l2_rejected_then_resolved';
}

function getL2Agent(category: string) {
  const mapping = CATEGORY_TEAM_MAP[category];
  if (!mapping || !mapping.department) return null;

  for (const dept of seedUsers.departments) {
    if (dept.name === mapping.department) {
      for (const team of dept.teams) {
        if (team.name === mapping.team && team.members.length > 0) {
          return { ...pickRandom(team.members), department: dept.name, team: team.name };
        }
      }
    }
  }
  return null;
}

async function generateOne(index: number): Promise<KBEntry | null> {
  let catCtx = pickRandom(CATEGORIES_WITH_CONTEXT);
  const scenario = pickScenario();
  const requester = pickRandom(seedUsers.requesters);
  const agent_l1 = pickRandom(seedUsers.serviceDesk.members);

  // l2 시나리오일 때 agent_l2를 찾을 수 있는 카테고리를 선택
  let agent_l2 = null;
  if (scenario !== 'l1_resolved') {
    // 매핑 가능한 카테고리만 필터링하여 선택
    const l2Categories = CATEGORIES_WITH_CONTEXT.filter(c => {
      const m = CATEGORY_TEAM_MAP[c.category];
      return m && m.department && m.team;
    });
    catCtx = pickRandom(l2Categories);
    agent_l2 = getL2Agent(catCtx.category);
    // 그래도 못 찾으면 l1으로 fallback
    if (!agent_l2) {
      return generateOneL1(index, catCtx, requester, agent_l1);
    }
  }

  const scenarioDesc = scenario === 'l1_resolved'
    ? '1차 처리자(ITHelpDesk팀)가 직접 답변하여 해결'
    : scenario === 'l2_resolved'
    ? '2차 처리자에게 이관 후 해결'
    : '2차 처리자가 "본인 아님" 처리 후 다른 담당자에게 재분배되어 해결';

  const scenarioGuidanceInline = scenario === 'l1_resolved'
    ? `\n[1차 처리자 답변 특징]\n- 전문 지식 없이도 답변 가능한 반복적/절차적 문의\n- 비밀번호 초기화, 계정 잠금 해제, 매뉴얼 안내, 접속 방법 안내, 간단한 오류 해결\n`
    : `\n[2차 처리자 답변 특징]\n- 전문 지식이 필요한 기술적 문의\n- 시스템 내부 설정 변경, 코드 수정, 마스터 데이터 조작, 서버 레벨 조치\n`;

  const l2Info = agent_l2
    ? `- 2차 처리자: ${agent_l2.name} (${agent_l2.email}, ${agent_l2.department}, ${agent_l2.team})`
    : '';

  const jsonFormat = scenario === 'l1_resolved'
    ? `{ "subject": "제목", "question": "문의", "answer": "답변", "tags": ["태그"] }`
    : `{ "subject": "제목", "question": "문의", "internal_note": "내부메모", "l2_response": "2차답변", "answer": "최종답변", "tags": ["태그"] }`;

  const prompt = `당신은 이랜드 그룹 IT Help Desk 티켓 데이터 생성 전문가입니다.

[시나리오: ${scenarioDesc}]
${scenarioGuidanceInline}
[등장인물]
- 요청자: ${requester.name} (${requester.email}, ${requester.company}, ${requester.department}, ${requester.position})
- 1차 처리자: ${agent_l1.name} (${agent_l1.email}, ITHelpDesk팀)
${l2Info}

[카테고리] ${catCtx.category}
[업무 컨텍스트] ${catCtx.context}

규칙:
- question: 요청자가 실제로 작성할 법한 자연스러운 문의
- answer: 최종 요청자에게 전달된 답변
${scenario !== 'l1_resolved' ? '- internal_note: 1차→2차 이관 시 내부 메모\n- l2_response: 2차 처리자의 내부 답변' : ''}
- 이랜드 그룹 시스템명(SAP, 이네스, 샵링크, flink, 이오피스, EIMS, GlobalProtect 등) 자연스럽게 사용
- 한국어로 작성
- ⚠️ 중요: JSON 문자열 값 안에서 줄바꿈은 반드시 \\n 으로 표현하세요. 실제 줄바꿈 문자를 넣지 마세요.
- ⚠️ 중요: 응답은 반드시 한 줄의 유효한 JSON이어야 합니다.

JSON으로만 응답 (한 줄로): ${jsonFormat}`;

  try {
    const response = await invokeModel({ prompt, modelType: 'lightweight', maxTokens: 2048, temperature: 0.8 });
    const parsed = parseJsonResponse(response.content);
    if (!parsed) return null;

    return {
      subject: parsed.subject || '',
      question: parsed.question || '',
      internal_note: parsed.internal_note || null,
      l2_response: parsed.l2_response || null,
      answer: parsed.answer || '',
      category: catCtx.category,
      department: agent_l2?.department || '',
      team: agent_l2?.team || '',
      tags: parsed.tags || [],
      resolution_type: scenario,
      requester: { name: requester.name, email: requester.email, company: requester.company },
      agent_l1: { name: agent_l1.name, email: agent_l1.email },
      agent_l2: agent_l2 ? { name: agent_l2.name, email: agent_l2.email, department: agent_l2.department, team: agent_l2.team } : null,
    };
  } catch (error) {
    console.error(`  [${index}] 실패:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  const TARGET = 200;
  console.log(`=== ${TARGET}건 생성 시작 ===\n`);

  const entries: KBEntry[] = [];

  for (let i = 0; i < TARGET; i++) {
    process.stdout.write(`[${i + 1}/${TARGET}] 생성 중...`);
    const entry = await generateOne(i);
    if (entry) {
      entries.push(entry);
      process.stdout.write(` ✓ ${entry.resolution_type} | ${entry.category}\n`);
    } else {
      process.stdout.write(` ✗ 실패\n`);
    }

    // 10건마다 중간 저장
    if ((i + 1) % 10 === 0) {
      const outputDir = resolve(__dirname, '../../data');
      await mkdir(outputDir, { recursive: true });
      await writeFile(resolve(outputDir, 'generated-200.json'), JSON.stringify(entries, null, 2), 'utf-8');
      console.log(`  → 중간 저장: ${entries.length}건\n`);
    }
  }

  const outputDir = resolve(__dirname, '../../data');
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'generated-200.json'), JSON.stringify(entries, null, 2), 'utf-8');

  console.log(`\n=== 완료: ${entries.length}건 → data/generated-200.json ===`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

async function generateOneL1(
  index: number,
  catCtx: typeof CATEGORIES_WITH_CONTEXT[number],
  requester: typeof seedUsers.requesters[number],
  agent_l1: typeof seedUsers.serviceDesk.members[number],
): Promise<KBEntry | null> {
  const prompt = buildPrompt('l1_resolved', catCtx, requester, agent_l1, null);
  try {
    const response = await invokeModel({ prompt, modelType: 'lightweight', maxTokens: 2048, temperature: 0.8 });
    const parsed = parseJsonResponse(response.content);
    if (!parsed) return null;
    return {
      subject: parsed.subject as string || '',
      question: parsed.question as string || '',
      internal_note: null,
      l2_response: null,
      answer: parsed.answer as string || '',
      category: catCtx.category,
      department: '',
      team: '',
      tags: (parsed.tags as string[]) || [],
      resolution_type: 'l1_resolved',
      requester: { name: requester.name, email: requester.email, company: requester.company },
      agent_l1: { name: agent_l1.name, email: agent_l1.email },
      agent_l2: null,
    };
  } catch (error) {
    console.error(`  [${index}] l1 fallback 실패:`, error instanceof Error ? error.message : error);
    return null;
  }
}

function buildPrompt(
  scenario: string,
  catCtx: typeof CATEGORIES_WITH_CONTEXT[number],
  requester: typeof seedUsers.requesters[number],
  agent_l1: typeof seedUsers.serviceDesk.members[number],
  agent_l2: { name: string; email: string; department: string; team: string } | null,
): string {
  const scenarioDesc = scenario === 'l1_resolved'
    ? '1차 처리자(ITHelpDesk팀)가 직접 답변하여 해결'
    : scenario === 'l2_resolved'
    ? '2차 처리자에게 이관 후 해결'
    : '2차 처리자가 "본인 아님" 처리 후 다른 담당자에게 재분배되어 해결';

  const scenarioGuidance = scenario === 'l1_resolved'
    ? `[1차 처리자 답변 특징 - 반드시 이 유형의 문의를 생성하세요]
- 전문 지식 없이도 답변 가능한 반복적/절차적 문의여야 함
- 예: 비밀번호 초기화, 계정 잠금 해제, 권한 설정 안내
- 예: 매뉴얼/가이드 링크 전달, 셀프서비스 방법 안내
- 예: 시스템 접속 방법, 설정 변경 절차 안내
- 예: 전산실/담당부서 연락처 안내
- 예: 간단한 오류 해결 (재시작, 캐시 삭제, 재로그인 등)`
    : `[2차 처리자 답변 특징 - 반드시 이 유형의 문의를 생성하세요]
- 전문 지식이 필요한 기술적 문의여야 함
- 예: 시스템 내부 설정 변경, 코드/로직 수정
- 예: 마스터 데이터 조작, DB 설정 변경
- 예: 서버/인프라 레벨 조치
- 예: 원인 분석 후 근본적 해결 (단순 안내가 아닌 실제 조치)`;

  const l2Info = agent_l2
    ? `- 2차 처리자: ${agent_l2.name} (${agent_l2.email}, ${agent_l2.department}, ${agent_l2.team})`
    : '';

  const jsonFormat = scenario === 'l1_resolved'
    ? `{ "subject": "제목", "question": "문의", "answer": "답변", "tags": ["태그"] }`
    : `{ "subject": "제목", "question": "문의", "internal_note": "내부메모", "l2_response": "2차답변", "answer": "최종답변", "tags": ["태그"] }`;

  return `당신은 이랜드 그룹 IT Help Desk 티켓 데이터 생성 전문가입니다.

[시나리오: ${scenarioDesc}]

${scenarioGuidance}

[등장인물]
- 요청자: ${requester.name} (${requester.email}, ${requester.company}, ${requester.department}, ${requester.position})
- 1차 처리자: ${agent_l1.name} (${agent_l1.email}, ITHelpDesk팀)
${l2Info}

[카테고리] ${catCtx.category}
[업무 컨텍스트] ${catCtx.context}

규칙:
- question: 요청자가 실제로 작성할 법한 자연스러운 문의
- answer: 최종 요청자에게 전달된 답변
${scenario !== 'l1_resolved' ? '- internal_note: 1차→2차 이관 시 내부 메모\n- l2_response: 2차 처리자의 내부 답변' : ''}
- 이랜드 그룹 시스템명(SAP, 이네스, 샵링크, flink, 이오피스, EIMS, GlobalProtect 등) 자연스럽게 사용
- 한국어로 작성
- ⚠️ 중요: JSON 문자열 값 안에서 줄바꿈은 반드시 \\n 으로 표현하세요. 실제 줄바꿈 문자를 넣지 마세요.
- ⚠️ 중요: 응답은 반드시 한 줄의 유효한 JSON이어야 합니다.

JSON으로만 응답 (한 줄로): ${jsonFormat}`;
}

function parseJsonResponse(content: string): Record<string, unknown> | null {
  // 1차 시도: 그대로 파싱
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch { /* fall through */ }

  // 2차 시도: 모든 실제 줄바꿈을 \\n으로 치환 후 파싱
  // (LLM에게 한 줄 JSON을 요청했으므로 구조적 줄바꿈은 없어야 함)
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const oneLine = jsonMatch[0]
        .replace(/\r\n/g, '\\n')
        .replace(/\r/g, '\\n')
        .replace(/\n/g, '\\n');
      return JSON.parse(oneLine);
    }
  } catch { /* fall through */ }

  // 3차 시도: 문자열 내부만 정밀 이스케이프
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let inString = false;
      let escaped = false;
      let result = '';

      for (let i = 0; i < jsonMatch[0].length; i++) {
        const ch = jsonMatch[0][i];
        if (escaped) { result += ch; escaped = false; continue; }
        if (ch === '\\') { result += ch; escaped = true; continue; }
        if (ch === '"') { inString = !inString; result += ch; continue; }
        if (inString && (ch === '\n' || ch === '\r')) {
          if (ch === '\r' && jsonMatch[0][i + 1] === '\n') { result += '\\n'; i++; }
          else { result += '\\n'; }
          continue;
        }
        result += ch;
      }
      return JSON.parse(result);
    }
  } catch { /* fall through */ }

  console.error('  JSON 파싱 실패 (3차 시도 모두 실패)');
  return null;
}
