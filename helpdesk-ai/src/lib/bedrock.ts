// ============================================================
// AWS Bedrock SDK 래퍼
// 소유 유닛: Unit 3 (AI/RAG)
// ============================================================

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveCommandInput,
} from '@aws-sdk/client-bedrock-agent-runtime';

// ─── 설정 ───────────────────────────────────────────────────

const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-2';
const BEDROCK_MODEL_LIGHTWEIGHT = process.env.BEDROCK_MODEL_LIGHTWEIGHT || 'anthropic.claude-3-haiku-20240307-v1:0';
const BEDROCK_MODEL_HEAVY = process.env.BEDROCK_MODEL_HEAVY || 'anthropic.claude-3-opus-20240229-v1:0';
const BEDROCK_KB_ID = process.env.BEDROCK_KB_ID || '';

// 토큰 단가 (USD per 1K tokens)
const TOKEN_PRICING: Record<string, { input: number; output: number }> = {
  [BEDROCK_MODEL_LIGHTWEIGHT]: { input: 0.00025, output: 0.00125 },
  [BEDROCK_MODEL_HEAVY]: { input: 0.015, output: 0.075 },
};

// ─── 클라이언트 초기화 ──────────────────────────────────────

const runtimeClient = new BedrockRuntimeClient({ region: AWS_REGION });
const agentRuntimeClient = new BedrockAgentRuntimeClient({ region: AWS_REGION });

// ─── 재시도 유틸 ────────────────────────────────────────────

const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000]; // exponential backoff

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isRetryable =
        lastError.name === 'ThrottlingException' ||
        lastError.name === 'ServiceUnavailableException' ||
        lastError.message.includes('timeout') ||
        (lastError as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
          ? ((lastError as { $metadata: { httpStatusCode: number } }).$metadata.httpStatusCode >= 500)
          : false;

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }

  throw lastError;
}

// ─── LLM 호출 ──────────────────────────────────────────────

export interface InvokeModelParams {
  prompt: string;
  modelType: 'lightweight' | 'heavy';
  maxTokens?: number;
  temperature?: number;
  attachments?: Array<{ base64: string; mimeType: string }>;
}

export interface InvokeModelResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  durationMs: number;
}

export async function invokeModel(params: InvokeModelParams): Promise<InvokeModelResponse> {
  const modelId = params.modelType === 'lightweight'
    ? BEDROCK_MODEL_LIGHTWEIGHT
    : BEDROCK_MODEL_HEAVY;

  // 메시지 content 구성
  const contentBlocks: Array<Record<string, unknown>> = [];

  // 첨부파일(이미지)이 있으면 멀티모달로 전달
  if (params.attachments && params.attachments.length > 0) {
    for (const att of params.attachments) {
      if (att.mimeType.startsWith('image/')) {
        contentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: att.mimeType, data: att.base64 },
        });
      } else {
        // 이미지가 아닌 파일은 텍스트로 추출된 내용을 전달
        contentBlocks.push({
          type: 'text',
          text: `[첨부파일 내용]\n${att.base64}`,
        });
      }
    }
  }

  // 텍스트 프롬프트 추가
  contentBlocks.push({ type: 'text', text: params.prompt });

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: params.maxTokens || 4096,
    temperature: params.temperature ?? 0.3,
    messages: [{ role: 'user', content: contentBlocks }],
  });

  const input: InvokeModelCommandInput = {
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: new TextEncoder().encode(body),
  };

  const startTime = Date.now();

  const response = await withRetry(async () => {
    const command = new InvokeModelCommand(input);
    return runtimeClient.send(command);
  });

  const durationMs = Date.now() - startTime;
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return {
    content: responseBody.content?.[0]?.text || '',
    inputTokens: responseBody.usage?.input_tokens || 0,
    outputTokens: responseBody.usage?.output_tokens || 0,
    modelId,
    durationMs,
  };
}

// ─── KB 검색 ────────────────────────────────────────────────

export interface RetrieveFromKBParams {
  query: string;
  topK?: number;
  filter?: {
    department?: string;
    team?: string;
    resolution_type?: string;
  };
}

export interface KBRetrieveResult {
  content: string;
  score: number;
  sourceId: string;
  metadata: Record<string, string>;
}

export async function retrieveFromKB(params: RetrieveFromKBParams): Promise<KBRetrieveResult[]> {
  if (!BEDROCK_KB_ID) {
    throw new Error('BEDROCK_KB_ID environment variable is not set');
  }

  const retrievalFilter = buildFilter(params.filter);

  const input: RetrieveCommandInput = {
    knowledgeBaseId: BEDROCK_KB_ID,
    retrievalQuery: { text: params.query },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: params.topK || 10,
        overrideSearchType: 'HYBRID',
        ...(retrievalFilter && { filter: retrievalFilter }),
      },
    },
  };

  // 디버그: 요청 body 출력
  console.log('\n[KB Retrieve] Request:', JSON.stringify(input, null, 2));

  const response = await withRetry(async () => {
    const command = new RetrieveCommand(input);
    return agentRuntimeClient.send(command);
  });

  return (response.retrievalResults || []).map((result) => ({
    content: result.content?.text || '',
    score: result.score || 0,
    sourceId: result.metadata?.['x-amz-bedrock-kb-source-uri'] || '',
    metadata: (result.metadata as Record<string, string>) || {},
  }));
}

// ─── 필터 빌더 ─────────────────────────────────────────────

function buildFilter(filter?: { department?: string; team?: string; resolution_type?: string }) {
  if (!filter) return undefined;

  const conditions: Array<{ key: string; value: string }> = [];

  if (filter.department) {
    conditions.push({ key: 'department', value: filter.department });
  }
  if (filter.team) {
    conditions.push({ key: 'team', value: filter.team });
  }
  if (filter.resolution_type) {
    conditions.push({ key: 'resolution_type', value: filter.resolution_type });
  }

  if (conditions.length === 0) return undefined;

  if (conditions.length === 1) {
    return {
      equals: { key: conditions[0].key, value: conditions[0].value },
    };
  }

  return {
    andAll: conditions.map((c) => ({
      equals: { key: c.key, value: c.value },
    })),
  };
}

// ─── 비용 계산 ──────────────────────────────────────────────

export function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const pricing = TOKEN_PRICING[modelId];
  if (!pricing) return 0;
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

// ─── 모델 ID 조회 ──────────────────────────────────────────

export function getModelId(modelType: 'lightweight' | 'heavy'): string {
  return modelType === 'lightweight' ? BEDROCK_MODEL_LIGHTWEIGHT : BEDROCK_MODEL_HEAVY;
}
