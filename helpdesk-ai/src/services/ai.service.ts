// ============================================================
// AIService - RAG 검색, LLM 호출, 답변 생성, 라우팅 판정
// 소유 유닛: Unit 3 (AI/RAG)
// ============================================================

import {
  invokeModel,
  retrieveFromKB,
  calculateCost,
  getModelId,
  type InvokeModelResponse,
} from '@/lib/bedrock';
import { prisma } from '@/lib/prisma';
import {
  type AIResponse,
  type Attachment,
  type IntentResult,
  type LLMUsageInput,
  type ModelType,
  type RAGResult,
  type RAGSource,
  type RoutingDecision,
} from '@/shared/types/ai';
import { CATEGORIES, ORGANIZATION_STRUCTURE } from '../shared/constants/categories';

// ─── 설정 ───────────────────────────────────────────────────

const RAG_TOP_K = 10;
const RAG_FALLBACK_MIN_RESULTS = 3;

import { getConfidenceThreshold as getConfidenceThresholdFromDB } from './config.service';

// ─── 모델 라우팅 ────────────────────────────────────────────

export function routeToModel(attachments?: Attachment[]): ModelType {
  if (attachments && attachments.length > 0) {
    return 'heavy';
  }
  return 'lightweight';
}

// ─── 의도 분석 ──────────────────────────────────────────────

export async function analyzeIntent(question: string, attachments?: Attachment[]): Promise<{
  intentResult: IntentResult;
  usage: InvokeModelResponse;
}> {
  const prompt = buildIntentPrompt(question);
  const modelType = routeToModel(attachments);

  // 첨부파일이 있으면 LLM에 함께 전달
  const llmAttachments = attachments
    ? await prepareAttachmentsForLLM(attachments)
    : undefined;

  const response = await invokeModel({
    prompt,
    modelType,
    maxTokens: 1024,
    temperature: 0.1,
    attachments: llmAttachments,
  });

  const intentResult = parseIntentResponse(response.content);

  return { intentResult, usage: response };
}

// ─── 답변 생성 ──────────────────────────────────────────────

export async function generateAnswer(
  ticketId: string,
  question: string,
  attachments?: Attachment[],
): Promise<AIResponse> {
  // 1. 의도 분석 (첨부파일 포함)
  const { intentResult, usage: intentUsage } = await analyzeIntent(question, attachments);

  // 의도 분석 로그
  await logUsage({
    ticketId,
    modelName: intentUsage.modelId,
    modelType: 'lightweight',
    inputTokens: intentUsage.inputTokens,
    outputTokens: intentUsage.outputTokens,
    costUsd: calculateCost(intentUsage.modelId, intentUsage.inputTokens, intentUsage.outputTokens),
    requestType: 'intent_analysis',
    durationMs: intentUsage.durationMs,
  });

  // 2. 1차 처리 문서에서 KB 검색 (resolution_type = l1_resolved)
  let ragResults = await searchKB(question, intentResult, 'l1_resolved');

  // 필터 결과 부족 시 fallback (필터 완화)
  if (ragResults.length < RAG_FALLBACK_MIN_RESULTS) {
    ragResults = await searchKB(question, undefined, 'l1_resolved');
  }

  // 3. 1차 신뢰도 산출
  const l1Confidence = assessConfidence(ragResults);
  const L1_THRESHOLD = 0.5;

  // 4. 1차 신뢰도 >= 50% → AI가 1차 답변 생성
  if (l1Confidence >= L1_THRESHOLD) {
    const modelType = routeToModel(attachments);
    const answerPrompt = buildAnswerPrompt(question, ragResults);

    // 첨부파일을 LLM에 전달할 형태로 변환
    const llmAttachments = attachments
      ? await prepareAttachmentsForLLM(attachments)
      : undefined;

    const answerResponse = await invokeModel({
      prompt: answerPrompt,
      modelType,
      maxTokens: 4096,
      attachments: llmAttachments,
    });

    const costUsd = calculateCost(
      answerResponse.modelId,
      answerResponse.inputTokens,
      answerResponse.outputTokens,
    );
    await logUsage({
      ticketId,
      modelName: answerResponse.modelId,
      modelType,
      inputTokens: answerResponse.inputTokens,
      outputTokens: answerResponse.outputTokens,
      costUsd,
      requestType: 'answer_gen',
      durationMs: answerResponse.durationMs,
    });

    const sources: RAGSource[] = ragResults.slice(0, 5).map((r) => ({
      entryId: r.sourceId,
      question: r.content.substring(0, 100),
      score: r.score,
      category: r.metadata.category,
    }));

    return {
      answer: answerResponse.content,
      confidence: l1Confidence,
      sources,
      modelUsed: answerResponse.modelId,
      tokensUsed: { input: answerResponse.inputTokens, output: answerResponse.outputTokens },
      intentResult,
    };
  }

  // 5. 1차 신뢰도 < 50% → 2차 처리 문서에서 KB 검색 (resolution_type = l2_resolved)
  let l2RagResults = await searchKB(question, intentResult, 'l2_resolved');

  if (l2RagResults.length < RAG_FALLBACK_MIN_RESULTS) {
    l2RagResults = await searchKB(question, undefined, 'l2_resolved');
  }

  const l2Confidence = assessConfidence(l2RagResults);

  const sources: RAGSource[] = l2RagResults.slice(0, 5).map((r) => ({
    entryId: r.sourceId,
    question: r.content.substring(0, 100),
    score: r.score,
    category: r.metadata.category,
  }));

  // 2차 처리자에게 바로 전달 (답변 생성 없음)
  return {
    answer: '',
    confidence: l2Confidence,
    sources,
    modelUsed: '',
    tokensUsed: { input: 0, output: 0 },
    intentResult,
  };
}

// ─── 신뢰도 산출 ────────────────────────────────────────────

export function assessConfidence(ragResults: RAGResult[]): number {
  if (ragResults.length === 0) return 0;
  const totalScore = ragResults.reduce((sum, r) => sum + r.score, 0);
  return totalScore / ragResults.length;
}

// ─── 라우팅 판정 ────────────────────────────────────────────

export async function determineRouting(
  confidence: number,
  ragResults: RAGResult[],
  intentResult: IntentResult,
  generatedAnswer: string,
): Promise<RoutingDecision> {
  const threshold = await getConfidenceThresholdFromDB();

  if (confidence >= threshold) {
    return { type: 'ai_answer', answer: generatedAnswer };
  }

  // 카테고리 기반 2차 분배 시도
  const matchedAgent = await findAgentByTeam(intentResult.team);
  if (matchedAgent) {
    return {
      type: 'route_to_l2',
      agentId: matchedAgent.id,
      reason: `카테고리 매칭: ${intentResult.categories[0] || ''} → ${intentResult.team}`,
    };
  }

  return { type: 'escalate_to_l1' };
}

// ─── Private → Public 변환 ──────────────────────────────────

export async function transformToPublic(privateContent: string): Promise<{
  publicContent: string;
  usage: InvokeModelResponse;
}> {
  const prompt = buildTransformPrompt(privateContent);

  try {
    const response = await invokeModel({
      prompt,
      modelType: 'lightweight',
      maxTokens: 4096,
      temperature: 0.3,
    });

    const content = response.content.trim();

    // LLM이 거절/변환 불가 응답을 했는지 감지
    const refusalKeywords = [
      '변환하기 어렵', '내용이 너무 부족', '충분한 내용', '다시 제공',
      '변환할 수 없', '답변을 생성하기 어렵', '정보가 부족',
    ];
    const isRefusal = refusalKeywords.some((kw) => content.includes(kw));

    if (isRefusal) {
      // 거절 감지 시 — 원본을 그대로 쓰지 않고 재시도 (더 강한 지시로)
      const retryPrompt = `당신은 IT Help Desk 고객 응대 담당자입니다.
IT 담당자가 남긴 메모: "${privateContent}"

이 메모의 의도를 파악하여 고객에게 전달할 정중하고 완성된 한국어 답변을 작성하세요.
메모가 짧거나 불명확해도 반드시 고객 응대 문장으로 완성해야 합니다.
답변만 출력하세요.`;

      try {
        const retryResponse = await invokeModel({
          prompt: retryPrompt,
          modelType: 'lightweight',
          maxTokens: 1024,
          temperature: 0.5,
        });
        return { publicContent: retryResponse.content.trim(), usage: response };
      } catch {
        // 재시도도 실패 시 — 담당자 확인 안내로 대체
        return {
          publicContent: "문의하신 내용을 검토하였습니다. 담당자가 추가 확인 후 상세한 안내를 드리겠습니다. 불편을 드려 죄송합니다.",
          usage: response,
        };
      }
    }

    return { publicContent: content, usage: response };
  } catch {
    // 실패 시 원본 반환 (내용 보존 우선)
    return {
      publicContent: privateContent,
      usage: {
        content: privateContent,
        inputTokens: 0,
        outputTokens: 0,
        modelId: getModelId('lightweight'),
        durationMs: 0,
      },
    };
  }
}

// ─── LLM 사용 로그 ──────────────────────────────────────────

export async function logUsage(input: LLMUsageInput): Promise<void> {
  try {
    await prisma.llmUsageLog.create({
      data: {
        ticketId: input.ticketId && input.ticketId !== '00000000-0000-0000-0000-000000000000' ? input.ticketId : null,
        modelName: input.modelName,
        modelType: input.modelType,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costUsd: input.costUsd,
        requestType: input.requestType,
        durationMs: input.durationMs,
      },
    });
  } catch (error) {
    // 로그 유실 허용 (비즈니스 크리티컬 아님)
    console.error('[AIService] Failed to log LLM usage:', error);
  }
}

// ─── 내부 헬퍼 ──────────────────────────────────────────────

async function prepareAttachmentsForLLM(
  attachments: Attachment[],
): Promise<Array<{ base64: string; mimeType: string }>> {
  const { readFile } = await import('fs/promises');
  const results: Array<{ base64: string; mimeType: string }> = [];

  for (const att of attachments) {
    try {
      if (att.mimeType.startsWith('image/')) {
        // 이미지: base64 인코딩하여 그대로 전달
        const buffer = await readFile(att.url);
        results.push({ base64: buffer.toString('base64'), mimeType: att.mimeType });
      } else if (att.mimeType === 'application/pdf') {
        // PDF: 텍스트 추출
        const buffer = await readFile(att.url);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
        const pdf = await pdfParse(buffer);
        results.push({ base64: pdf.text, mimeType: 'text/plain' });
      } else {
        // 기타 파일(워드, 엑셀 등): 파일명만 전달 (추후 확장)
        results.push({ base64: `[첨부파일: ${att.filename}]`, mimeType: 'text/plain' });
      }
    } catch (error) {
      console.error(`[AIService] 첨부파일 처리 실패 (${att.filename}):`, error);
      results.push({ base64: `[첨부파일 읽기 실패: ${att.filename}]`, mimeType: 'text/plain' });
    }
  }

  return results;
}

async function searchKB(question: string, intentResult?: IntentResult, resolutionType?: string): Promise<RAGResult[]> {
  const filter: { department?: string; team?: string; resolution_type?: string } = {};

  if (intentResult?.department) filter.department = intentResult.department;
  if (intentResult?.team) filter.team = intentResult.team;
  if (resolutionType) filter.resolution_type = resolutionType;

  const hasFilter = Object.keys(filter).length > 0;

  const results = await retrieveFromKB({
    query: question,
    topK: RAG_TOP_K,
    filter: hasFilter ? filter : undefined,
  });

  return results.map((r) => ({
    content: r.content,
    score: r.score,
    sourceId: r.sourceId,
    metadata: {
      category: r.metadata['category'] || '',
      sourceType: r.metadata['source_type'] || '',
      department: r.metadata['department'] || '',
      team: r.metadata['team'] || '',
      sourceTicketId: r.metadata['source_ticket_id'],
    },
  }));
}

async function findAgentByTeam(teamName: string) {
  if (!teamName) return null;

  const agent = await prisma.user.findFirst({
    where: {
      role: 'agent_l2',
      isActive: true,
      team: { name: teamName },
    },
    orderBy: { createdAt: 'asc' },
  });

  return agent;
}
// ─── 프롬프트 빌더 ─────────────────────────────────────────

function buildIntentPrompt(question: string): string {
  const orgStructure = ORGANIZATION_STRUCTURE.map(
    (dept: { department: string; teams: readonly string[] }) => `- ${dept.department}: ${dept.teams.join(', ')}`,
  ).join('\n');

  const categoryList = CATEGORIES.join(', ');

  return `당신은 IT Help Desk 문의 분류 전문가입니다.
아래 문의를 분석하여 담당 부서, 팀, 카테고리를 판별하세요.
첨부파일(이미지, 문서)이 함께 제공된 경우 해당 내용도 참고하여 판단하세요.

[조직 구조]
${orgStructure}

[카테고리 목록]
${categoryList}

[문의 내용]
${question}

다음 JSON 형식으로만 응답하세요:
{
  "department": "부서명",
  "team": "팀명",
  "categories": ["카테고리1", "카테고리2"]
}

규칙:
- department와 team은 위 조직 구조에서 선택
- categories는 위 카테고리 목록에서 최대 10개 선택
- 반드시 위 카테고리 목록 중 가장 적합한 것을 선택해야 함 (목록 외 카테고리 사용 금지)
- 첨부파일에 오류 화면, 시스템 화면 등이 있으면 해당 시스템을 파악하여 분류
- 판단이 어려운 경우에도 반드시 목록 중 가장 유사한 카테고리를 선택할 것 (빈 배열 금지)
- 판단이 어려우면 department: "", team: "", categories: ["계정/권한 관리"]`;
}

function buildAnswerPrompt(question: string, ragResults: RAGResult[]): string {
  const context = ragResults
    .map((r, i) => `[참고 ${i + 1}] (유사도: ${(r.score * 100).toFixed(1)}%)\n${r.content}`)
    .join('\n\n');

  return `당신은 IT Help Desk AI 상담원입니다.
아래 참고 자료를 기반으로 사용자 문의에 답변하세요.

[참고 자료]
${context}

[사용자 문의]
${question}

규칙:
- 참고 자료에 있는 내용을 기반으로 반드시 구체적인 답변을 제공하세요
- 참고 자료의 답변 내용을 요약하거나 재구성하여 사용자에게 전달하세요
- "정확한 안내가 어렵습니다", "IT Help Desk에 문의하세요" 같은 회피 답변은 절대 하지 마세요
- 참고 자료에 해결 방법이 있으면 그대로 안내하세요
- 친절하고 정중한 문체 사용
- 단계별 안내가 필요하면 번호 매기기`;
}

function buildTransformPrompt(privateContent: string): string {
  return `당신은 IT Help Desk 고객 응대 전문가입니다.
IT 담당자가 내부적으로 남긴 메모를 보고, 고객에게 전달할 정중하고 완성된 답변을 직접 작성하세요.

[중요 원칙]
- 당신이 직접 고객에게 답변을 작성하는 것입니다
- 내부 메모의 핵심 의미와 결론을 파악하여 고객이 이해할 수 있는 완성된 문장으로 작성하세요
- 내부 메모가 짧거나 구어체여도 그 의도를 파악하여 정중한 고객 응대 문장으로 완성하세요
- 예시: 내부 메모 "글쎄요" → 고객 답변 "문의하신 내용을 검토한 결과, 현재 명확한 해결 방법을 확인하기 어려운 상황입니다. 추가 확인 후 다시 안내드리겠습니다."
- 예시: 내부 메모 "안됨" → 고객 답변 "문의하신 사항은 현재 정책상 처리가 어렵습니다. 불편을 드려 죄송합니다."
- 예시: 내부 메모 "비밀번호 초기화하면 됨" → 고객 답변 "비밀번호를 초기화하시면 문제가 해결됩니다. 비밀번호 초기화는 [방법]을 통해 진행하실 수 있습니다."

[절대 금지]
- "변환하기 어렵습니다", "내용이 부족합니다" 등 거절 문구 사용 금지
- 내부 메모를 그대로 복사하여 전달 금지
- 내부 직원 간 표현(직급, 내부 시스템명, 구어체) 그대로 사용 금지
- 고객에게 "글쎄요", "모르겠어요" 등 불확실한 표현 전달 금지

[내부 담당자 메모]
${privateContent}

위 메모의 의미를 파악하여 고객에게 전달할 완성된 답변만 작성하세요.`;
}

function parseIntentResponse(content: string): IntentResult {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { department: '', team: '', categories: ['기타'] };
    }
    const parsed = JSON.parse(jsonMatch[0]);

    const department = parsed.department || '';
    const team = parsed.team || '';
    const categories: string[] = Array.isArray(parsed.categories) ? parsed.categories : ['기타'];

    // 팀 유효성 검증: ORGANIZATION_STRUCTURE에 존재하는 팀인지 확인
    const validTeam = ORGANIZATION_STRUCTURE.some(
      (dept: { department: string; teams: readonly string[] }) =>
        dept.department === department && dept.teams.includes(team),
    );

    if (!validTeam && team) {
      // 유효하지 않은 팀이면 빈 값으로 (1차 처리자 큐로 감)
      return { department: '', team: '', categories };
    }

    return { department, team, categories };
  } catch {
    return { department: '', team: '', categories: ['기타'] };
  }
}

