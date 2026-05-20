import 'dotenv/config';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { resolve } from 'path';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import seedUsers from '../../data/seed-users.json';
import { CATEGORY_TEAM_MAP } from '../../src/shared/constants/categories';

// Haiku 3.5 — 빠르고 저렴
const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';
const REGION = 'us-east-1';
const CONCURRENCY = 5; // 동시 호출 수
const TARGET = parseInt(process.argv[2] || '200', 10);
const OUTPUT_FILE = process.argv[3] || 'data/generated-fast.json';

const client = new BedrockRuntimeClient({ region: REGION });

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
  { category: '웹/앱 개발', context: '웹사이트, 모바일앱 오류, 기능 개발 요청' },
  { category: 'AX/업무혁신', context: '업무 자동화, RPA, 프로세스 개선' },
  { category: '데이터사이언스/AI', context: 'AI 모델, 데이터 분석, 머신러닝' },
  { category: '경영기획 시스템', context: '경영기획 관련 시스템, 예산 관리' },
  { category: '경영지원 시스템', context: '경영지원 업무 시스템, 총무 시스템' },
  { category: 'HR/인사 시스템', context: '인사 시스템, 급여, 근태 관리' },
  { category: '인사/총무', context: '인사 행정, 총무 업무, 복리후생' },
  { category: '재무/회계 시스템', context: '재무 시스템, 회계 처리, 결산' },
  { category: '세무/행정', context: '세무 신고, 행정 업무 시스템' },
  { category: '홍보/마케팅 시스템', context: '홍보 플랫폼, 마케팅 도구, 캠페인 관리' },
];

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

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

async function invokeHaiku(prompt: string): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2048,
    temperature: 0.8,
    messages: [{ role: 'user', content: prompt }],
  });

  const resp = await client.send(new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: new TextEncoder().encode(body),
  }));

  const result = JSON.parse(new TextDecoder().decode(resp.body));
  return result.content?.[0]?.text || '';
}

function parseJson(content: string): Record<string, unknown> | null {
  try {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  try {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0].replace(/\r\n/g, '\\n').replace(/\n/g, '\\n'));
  } catch {}
  try {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      let inStr = false, esc = false, r = '';
      for (let i = 0; i < m[0].length; i++) {
        const c = m[0][i];
        if (esc) { r += c; esc = false; continue; }
        if (c === '\\') { r += c; esc = true; continue; }
        if (c === '"') { inStr = !inStr; r += c; continue; }
        if (inStr && (c === '\n' || c === '\r')) { r += '\\n'; if (c === '\r' && m[0][i+1] === '\n') i++; continue; }
        r += c;
      }
      return JSON.parse(r);
    }
  } catch {}
  return null;
}

async function main() {
  console.log(`=== 고속 생성 (Haiku 3.5, 병렬 ${CONCURRENCY}) ===`);
  console.log(`목표: ${TARGET}건 → ${OUTPUT_FILE}\n`);

  const entries: KBEntry[] = [];
  let calls = 0;

  while (entries.length < TARGET) {
    const batch = Math.min(CONCURRENCY, TARGET - entries.length);
    const promises = Array.from({ length: batch }, () => generateOne());
    const results = await Promise.allSettled(promises);

    for (const r of results) {
      calls++;
      if (r.status === 'fulfilled' && r.value) {
        entries.push(r.value);
      }
    }

    process.stdout.write(`\r  ${entries.length}/${TARGET} (호출: ${calls})`);

    if (entries.length % 50 === 0 && entries.length > 0) {
      const dir = resolve(__dirname, '../../data');
      await mkdir(dir, { recursive: true });
      await writeFile(resolve(dir, OUTPUT_FILE.replace('data/', '')), JSON.stringify(entries.slice(0, TARGET), null, 2), 'utf-8');
    }
  }

  const final = entries.slice(0, TARGET);
  const dir = resolve(__dirname, '../../data');
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, OUTPUT_FILE.replace('data/', '')), JSON.stringify(final, null, 2), 'utf-8');

  const l1 = final.filter(e => e.resolution_type === 'l1_resolved').length;
  const l2 = final.filter(e => e.resolution_type === 'l2_resolved').length;
  const l2r = final.filter(e => e.resolution_type === 'l2_rejected_then_resolved').length;

  console.log(`\n\n=== 완료 ===`);
  console.log(`생성: ${final.length}건 (l1: ${l1}, l2: ${l2}, l2r: ${l2r})`);
  console.log(`LLM 호출: ${calls}회`);
  console.log(`파일: ${OUTPUT_FILE}`);
}

async function generateOne(): Promise<KBEntry | null> {
  let scenario = pickScenario();
  let catCtx = pickRandom(CATEGORIES_WITH_CONTEXT);
  const requester = pickRandom(seedUsers.requesters);
  const agent_l1 = pickRandom(seedUsers.serviceDesk.members);

  let agent_l2 = null;
  if (scenario !== 'l1_resolved') {
    const l2Cats = CATEGORIES_WITH_CONTEXT.filter(c => { const m = CATEGORY_TEAM_MAP[c.category]; return m && m.department && m.team; });
    catCtx = pickRandom(l2Cats);
    agent_l2 = getL2Agent(catCtx.category);
    if (!agent_l2) scenario = 'l1_resolved';
  }

  const scenarioGuidance = scenario === 'l1_resolved'
    ? '[1차-단순문의] 비밀번호 초기화, 계정 잠금 해제, 그룹메일 변경, 접속 방법, 매뉴얼 안내, 연락처 안내'
    : '[2차-전문기술] 시스템 설정 변경, 코드 수정, 마스터 데이터 조작, 서버 조치, DB 수정';

  const l2Info = agent_l2 ? `2차: ${agent_l2.name} (${agent_l2.department}, ${agent_l2.team})` : '';
  const jsonFmt = scenario === 'l1_resolved'
    ? '{"subject":"제목","question":"문의","answer":"답변","tags":["태그"]}'
    : '{"subject":"제목","question":"문의","internal_note":"내부메모","l2_response":"2차답변","answer":"최종답변","tags":["태그"]}';

  const prompt = `IT Help Desk 티켓 1건. ${scenarioGuidance}
요청자:${requester.name}(${requester.company}) 1차:${agent_l1.name} ${l2Info}
카테고리:${catCtx.category}|${catCtx.context}
JSON한줄(줄바꿈은\\n): ${jsonFmt}`;

  try {
    const content = await invokeHaiku(prompt);
    const parsed = parseJson(content);
    if (!parsed) return null;

    return {
      subject: (parsed.subject as string) || '',
      question: (parsed.question as string) || '',
      internal_note: (parsed.internal_note as string) || null,
      l2_response: (parsed.l2_response as string) || null,
      answer: (parsed.answer as string) || '',
      category: catCtx.category,
      department: agent_l2?.department || '',
      team: agent_l2?.team || '',
      tags: (parsed.tags as string[]) || [],
      resolution_type: scenario,
      requester: { name: requester.name, email: requester.email, company: requester.company },
      agent_l1: { name: agent_l1.name, email: agent_l1.email },
      agent_l2: agent_l2 ? { name: agent_l2.name, email: agent_l2.email, department: agent_l2.department, team: agent_l2.team } : null,
    };
  } catch { return null; }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
