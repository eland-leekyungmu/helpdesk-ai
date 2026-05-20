# Unit 3: AI/RAG — Domain Entities

---

## 1. 소유 엔티티

### 1.1 LlmUsageLog (LLM 사용 로그)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | UUID | PK |
| ticketId | UUID? | 관련 티켓 (합성 데이터 생성 시 null) |
| modelName | string | 모델명 (예: "claude-3-haiku", "claude-3-opus") |
| modelType | ModelType | lightweight / heavy |
| inputTokens | number | 입력 토큰 수 |
| outputTokens | number | 출력 토큰 수 |
| costUsd | Decimal | 비용 (USD) |
| requestType | LlmRequestType | answer_gen / routing / category / synthesis / public_transform |
| durationMs | number | 응답 시간 (ms) |
| createdAt | DateTime | 호출 시간 |

### 1.2 KnowledgeBaseEntry (KB 엔트리)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | UUID | PK |
| sourceType | KbSourceType | real_data / synthetic / feedback |
| question | string | 질문 텍스트 |
| answer | string | 답변 텍스트 |
| category | string | 카테고리 (사전 정의 23개 중 하나) |
| isSynthetic | boolean | 합성 데이터 여부 |
| qualityScore | Decimal? | 품질 점수 (0~1) |
| sourceTicketId | UUID? | 원본 티켓 ID (feedback 타입일 때) |
| createdAt | DateTime | 생성일 |
| indexedAt | DateTime? | KB 색인 완료 시간 |

---

## 2. 참조 엔티티 (읽기 전용)

### 2.1 Ticket (from Unit 2)
- id, ticketNumber, subject, category, confidenceScore
- AIService가 답변 생성 시 참조

### 2.2 Message (from Unit 2)
- id, ticketId, content, visibility, senderType
- transformToPublic 시 Private 메시지 참조

### 2.3 User (from Unit 4)
- id, role, teamId
- 2차 분배 시 팀 기반 담당자 조회

### 2.4 Team (from Unit 4)
- id, name, departmentId
- 카테고리 → 팀 매핑 시 참조

---

## 3. Value Objects (서비스 내부 타입)

### 3.1 AIResponse

```typescript
interface AIResponse {
  answer: string;
  confidence: number;
  sources: RAGSource[];
  modelUsed: string;
  tokensUsed: { input: number; output: number };
}
```

### 3.2 RAGResult

```typescript
interface RAGResult {
  content: string;       // KB 엔트리 내용
  score: number;         // 유사도 점수 (0~1)
  sourceId: string;      // KB 엔트리 ID
  metadata: {
    category: string;
    sourceType: string;
    sourceTicketId?: string;
  };
}
```

### 3.3 RAGSource

```typescript
interface RAGSource {
  entryId: string;
  question: string;
  score: number;
  category: string;
}
```

### 3.4 RoutingDecision

```typescript
type RoutingDecision =
  | { type: 'ai_answer'; answer: string }
  | { type: 'route_to_l2'; agentId: string; reason: string }
  | { type: 'escalate_to_l1' };
```

### 3.5 ModelRouteInput

```typescript
interface ModelRouteInput {
  question: string;
  attachments?: Attachment[];
  requestType: LlmRequestType;
}
```

### 3.6 IntentResult

```typescript
interface IntentResult {
  department: string;   // 추정 부서명
  team: string;         // 추정 팀명
  categories: string[]; // 추천 카테고리 (최대 10개, closed set)
}
```

### 3.7 KBMetadata

```typescript
interface KBMetadata {
  category: string;      // 카테고리 (23개 중 하나)
  source_type: string;   // real_data / synthetic / feedback
  department: string;    // 부서명
  team: string;          // 팀명
}
```

### 3.8 LLMUsageInput

```typescript
interface LLMUsageInput {
  ticketId?: string;
  modelName: string;
  modelType: ModelType;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  requestType: LlmRequestType;
  durationMs: number;
}
```

### 3.8 LLMUsageInput

```typescript
interface LLMUsageInput {
  ticketId?: string;
  modelName: string;
  modelType: ModelType;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  requestType: LlmRequestType;
  durationMs: number;
}
```

### 3.9 SyntheticEntry

```typescript
interface SyntheticEntry {
  question: string;
  answer: string;
  category: string;
  qualityScore?: number;
}
```

### 3.10 ValidationResult

```typescript
interface ValidationResult {
  totalInput: number;
  passed: number;
  duplicatesRemoved: number;
  invalidFormat: number;
  entries: SyntheticEntry[];
}
```

---

## 4. 카테고리 상수

```typescript
const CATEGORIES = [
  '웹/앱 개발',
  'ERP 시스템',
  'CRM 시스템',
  '클라우드 인프라',
  '네트워크',
  'IT 인프라 (서버/스토리지)',
  '정보보안',
  '데이터/분석 플랫폼',
  'AX/업무혁신',
  'BI/리포트',
  '데이터사이언스/AI',
  '그룹웨어 (메일/캘린더/결재)',
  'SCM (공급망)',
  'FCM (매장관리)',
  '경영기획 시스템',
  '경영지원 시스템',
  'HR/인사 시스템',
  '인사/총무',
  '재무/회계 시스템',
  '세무/행정',
  '홍보/마케팅 시스템',
  '계정/권한 관리',
  '기타',
] as const;

type Category = typeof CATEGORIES[number];
```

---

## 5. 엔티티 관계

```
LlmUsageLog ──> Ticket (optional FK)
KnowledgeBaseEntry ──> (no FK, sourceTicketId는 논리적 참조)

AIService 내부:
  RAGResult[] ──> KnowledgeBaseEntry (KB 검색 결과)
  RoutingDecision ──> User/Team (분배 대상)
```
