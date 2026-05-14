// ============================================================
// AI/RAG 공유 타입 정의
// 소유 유닛: Unit 3 (AI/RAG)
// ============================================================

/** LLM 모델 타입 */
export type ModelType = 'lightweight' | 'heavy';

/** LLM 요청 유형 */
export type LlmRequestType =
  | 'answer_gen'
  | 'routing'
  | 'category'
  | 'synthesis'
  | 'public_transform'
  | 'intent_analysis'
  | 'seed_generation';

/** KB 소스 타입 */
export type KbSourceType = 'real_data' | 'synthetic' | 'feedback';

/** RAG 검색 결과 단건 */
export interface RAGResult {
  content: string;
  score: number;
  sourceId: string;
  metadata: {
    category: string;
    sourceType: string;
    department: string;
    team: string;
    sourceTicketId?: string;
  };
}

/** RAG 출처 (답변에 포함) */
export interface RAGSource {
  entryId: string;
  question: string;
  score: number;
  category: string;
}

/** AI 답변 응답 */
export interface AIResponse {
  answer: string;
  confidence: number;
  sources: RAGSource[];
  modelUsed: string;
  tokensUsed: { input: number; output: number };
  intentResult: IntentResult;
}

/** 라우팅 판정 결과 */
export type RoutingDecision =
  | { type: 'ai_answer'; answer: string }
  | { type: 'route_to_l2'; agentId: string; reason: string }
  | { type: 'escalate_to_l1' };

/** 모델 라우팅 입력 */
export interface ModelRouteInput {
  question: string;
  attachments?: Attachment[];
  requestType: LlmRequestType;
}

/** 의도 분석 결과 */
export interface IntentResult {
  department: string;
  team: string;
  categories: string[];
}

/** LLM 사용 로그 입력 */
export interface LLMUsageInput {
  ticketId?: string;
  modelName: string;
  modelType: ModelType;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  requestType: LlmRequestType;
  durationMs: number;
}

/** 첨부파일 */
export interface Attachment {
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

/** KB 메타데이터 */
export interface KBMetadata {
  category: string;
  source_type: string;
  department: string;
  team: string;
}

/** 합성 데이터 엔트리 */
export interface SyntheticEntry {
  question: string;
  answer: string;
  category: string;
  department: string;
  team: string;
  qualityScore?: number;
}

/** 품질 검증 결과 */
export interface ValidationResult {
  totalInput: number;
  passed: number;
  duplicatesRemoved: number;
  invalidFormat: number;
  entries: SyntheticEntry[];
}

/** KB 적재 결과 */
export interface LoadResult {
  totalLoaded: number;
  failed: number;
  errors: string[];
}
