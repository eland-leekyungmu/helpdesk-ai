# Code Generation Plan - Unit 3: AI/RAG

## Unit Context

| 항목 | 내용 |
|---|---|
| **Unit Name** | AI/RAG |
| **담당 영역** | RAG 검색, LLM 호출, 답변 생성, 모델 라우팅, 합성 데이터 |
| **기술 스택** | AWS Bedrock SDK, Knowledge Base API, Prisma ORM, Node.js |
| **소유 테이블** | llm_usage_logs, knowledge_base_entries |

## Dependencies

- **외부 서비스**: AWS Bedrock (LLM), Bedrock Knowledge Base (RAG)
- **내부 참조**: `src/shared/types/` (공유 타입, 읽기 전용)
- **호출 관계**: Unit 2 (TicketService) → Unit 3 (AIService) 호출
- **이벤트 수신**: `message.private.created`, `assignment.rejected`
- **이벤트 발행**: `llm.usage`

## Story Traceability

| Story ID | 설명 | 구현 대상 |
|---|---|---|
| US-1.2 | AI 자동 답변 수신 (RAG + LLM) | AIService.generateAnswer, assessConfidence, determineRouting |
| US-1.3 | AI 카테고리 추천 | AIService.suggestCategory |
| US-1.4 | 답변 불가 시 에스컬레이션 (신뢰도 판정) | AIService.determineRouting |
| US-4.2 | Private → Public 변환 | AIService.transformToPublic |
| US-9.1 | 합성 데이터 생성 | DataPipelineService.generateSynthetic |
| US-9.2 | 합성 데이터 품질 검증 | DataPipelineService.validateQuality |
| US-9.3 | 합성 데이터 KB 적재 | DataPipelineService.loadToKB |

---

## Code Generation Steps

### Step 1: 공유 타입 정의 (AI/LLM 관련)
- [x] `helpdesk-ai/src/shared/types/ai.ts` 생성
  - AIResponse, RAGResult, RAGSource, RoutingDecision, ModelRouteInput, LLMUsageInput 타입
  - ModelType, RequestType enum 재정의 (런타임용)
  - 신뢰도 임계값 상수

### Step 2: Bedrock SDK 래퍼 구현
- [x] `helpdesk-ai/src/lib/bedrock.ts` 생성
  - BedrockRuntimeClient 초기화
  - BedrockAgentRuntimeClient 초기화 (Knowledge Base용)
  - invokeModel() — LLM 호출 래퍼
  - retrieveFromKB() — Knowledge Base 검색 래퍼
  - 에러 핸들링, 재시도 로직
  - 환경 변수 기반 설정 (모델 ID, KB ID, region)

### Step 3: AIService 핵심 로직 구현
- [x] `helpdesk-ai/src/services/ai.service.ts` 생성
  - analyzeIntent() — 의도 분석 (department/team/categories 추정)
  - routeToModel() — 입력 유형별 모델 선택 (텍스트→lightweight, 첨부→heavy)
  - generateAnswer() — 의도 분석 + RAG 검색(필터) + LLM 답변 생성 + 신뢰도 산출
  - assessConfidence() — RAG 결과 기반 신뢰도 점수 계산
  - determineRouting() — 신뢰도 기반 라우팅 판정 (ai_answer / route_to_l2 / escalate_to_l1)
  - transformToPublic() — 2차 Private 답변 → Public 가공 (문맥만 수정, 내용 변경 금지)
  - logUsage() — LLM 호출 로그 DB 저장

### Step 4: AIService 단위 테스트
- [x] `helpdesk-ai/tests/unit/services/ai.service.test.ts` 생성

### Step 5: AIService 코드 요약 문서
- [x] `aidlc-docs/construction/ai-rag/code/ai-service-summary.md` 생성

### Step 6: DataPipelineService 구현
- [x] `helpdesk-ai/src/services/data-pipeline.service.ts` 생성
  - generateSeedData() — LLM으로 카테고리별 시드 데이터 생성
  - loadSourceData() — JSON 파일에서 소스 데이터 로드
  - generateSynthetic() — LLM 기반 합성 Q&A 생성 (paraphrase, 변형, 신규)
  - validateQuality() — 중복 제거, 형식 검증, 카테고리 태깅
  - loadToKB() — knowledge_base_entries 테이블 적재

### Step 7: DataPipelineService 단위 테스트
- [x] `helpdesk-ai/tests/unit/services/data-pipeline.service.test.ts` 생성

### Step 8: DataPipelineService 코드 요약 문서
- [x] `aidlc-docs/construction/ai-rag/code/data-pipeline-summary.md` 생성

### Step 9: 배치 실행 스크립트 구현
- [x] `helpdesk-ai/scripts/data-pipeline/generate-synthetic.ts` 생성
- [x] `helpdesk-ai/scripts/data-pipeline/validate-and-load.ts` 생성

### Step 10: Repository 레이어 구현
- [x] `helpdesk-ai/src/repositories/llm-usage.repository.ts` 생성
- [x] `helpdesk-ai/src/repositories/knowledge-base.repository.ts` 생성

### Step 11: Repository 단위 테스트
- [x] `helpdesk-ai/tests/unit/repositories/llm-usage.repository.test.ts` 생성
- [x] `helpdesk-ai/tests/unit/repositories/knowledge-base.repository.test.ts` 생성

### Step 12: Repository 코드 요약 문서
- [x] `aidlc-docs/construction/ai-rag/code/repository-summary.md` 생성

### Step 13: 환경 변수 및 설정 문서
- [x] `helpdesk-ai/.env.example` 업데이트 (AI/RAG 관련 변수 추가)
- [x] `aidlc-docs/construction/ai-rag/code/configuration-summary.md` 생성

### Step 14: 최종 검증 및 정리
- [x] 전체 파일 lint/type 검사
- [x] import 경로 정합성 확인
- [x] 보안 규칙 준수 확인 (SECURITY-03, 05, 15)

---

## Security Compliance Checklist

| Rule | 적용 여부 | 구현 방법 |
|---|---|---|
| SECURITY-01 | N/A (인프라 레벨, Unit 5) | - |
| SECURITY-02 | N/A (네트워크 레벨, Unit 5) | - |
| SECURITY-03 | ✅ 적용 | 구조화된 로깅 (logger 사용, PII 제외) |
| SECURITY-05 | ✅ 적용 | 입력 검증 (zod schema), 길이 제한 |
| SECURITY-09 | ✅ 적용 | 에러 응답에 내부 정보 미노출 |
| SECURITY-10 | ✅ 적용 | 의존성 정확한 버전 고정 |
| SECURITY-11 | ✅ 적용 | AI 로직 전용 모듈 분리 |
| SECURITY-15 | ✅ 적용 | 모든 외부 호출 try/catch, fail-closed |

---

## Estimated Scope
- **총 14 Steps**
- **생성 파일**: ~12개 (소스 6 + 테스트 4 + 문서 4 + 스크립트 2)
- **주요 의존 패키지**: @aws-sdk/client-bedrock-runtime, @aws-sdk/client-bedrock-agent-runtime, zod
