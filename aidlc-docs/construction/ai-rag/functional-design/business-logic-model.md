# Unit 3: AI/RAG — Business Logic Model

---

## 1. 핵심 비즈니스 흐름

### 1.1 문의 접수 → AI 답변 생성 흐름

```
[TicketService.createTicket() 호출]
        |
        v
AIService.routeToModel(input)
  - 첨부파일 존재? → heavy (Claude Opus)
  - 텍스트만? → lightweight (Claude Haiku)
        |
        v
AIService.analyzeIntent(question)  ← [NEW] 의도 분석 (lightweight)
  - LLM이 질문의 의도를 파악
  - 담당 department, team 추정
  - 카테고리 추천 (최대 10개)
  - 반환: { department, team, categories }
        |
        v
AIService.generateAnswer(ticketId, question, attachments?, intentResult)
  1. KB 검색 시 department/team 메타데이터 필터 적용
  2. 필터된 범위 내에서 RAG 유사도 상위 10건 검색
  3. RAG 결과 + 질문을 LLM에 전달하여 답변 생성
  4. assessConfidence() → RAG 유사도 점수 평균 산출
  5. determineRouting(confidence, ragResults, intentResult)
        |
        +---> confidence >= 0.8 → { type: 'ai_answer', answer }
        |         → Public 메시지로 즉시 전달
        |
        +---> confidence < 0.8 + 카테고리 매칭 가능 → { type: 'route_to_l2', agentId, reason }
        |         → 2차 처리자에게 자동 분배 (intentResult.team 기반)
        |
        +---> confidence < 0.8 + 카테고리 매칭 불가 → { type: 'escalate_to_l1' }
                  → 1차 처리자 큐에 추가 (요청자 안내 없음)
        |
        v
AIService.logUsage() → 비동기 LLM 사용 로그 저장
```

### 1.1.1 의도 분석 (analyzeIntent) 상세

```
AIService.analyzeIntent(question)
  1. lightweight 모델(Haiku) 사용
  2. 프롬프트에 조직 구조(8개 부서, 23개 팀) 목록 포함
  3. LLM이 질문을 분석하여 가장 적합한 department + team 반환
  4. 동시에 카테고리도 추천 (suggestCategory 통합)
  5. 반환값이 KB 검색 필터 + 2차 분배 대상 결정에 모두 사용됨
```

### 1.2 2차 Private → Public 변환 흐름

```
[2차 처리자가 Private 메시지 작성]
        |
        v (이벤트: message.private.created)
        |
AIService.transformToPublic(privateMessage)
  1. lightweight 모델(Haiku) 사용
  2. 프롬프트: "아래 내부 답변을 고객 응대용으로 변환하세요"
     - 호칭/지칭 변경 (내부 호칭 → 일반 호칭)
     - 내부 시스템명/프로세스명 제거
     - 문체 통일 (친절한 고객 응대 문체)
     - ⚠️ 내용(사실, 정보, 지시사항) 변경 금지
  3. 변환된 텍스트 반환
        |
        v
TicketService.addMessage(public, ai, ai_original_id=privateMessage.id)
```

### 1.3 카테고리 추천 흐름

```
※ suggestCategory는 analyzeIntent에 통합됨

AIService.analyzeIntent(question)
  - department, team, categories를 한 번의 LLM 호출로 모두 반환
  - 별도 suggestCategory 호출 불필요
  - 카테고리는 사전 정의 23개 목록에서 선택 (closed set, 최대 10개)
```

### 1.4 "본인 아님" 재분배 판정 흐름

```
[2차 처리자가 "본인 아님" 처리]
        |
        v (이벤트: assignment.rejected)
        |
AIService.determineRouting(confidence, ragResults)
  - 카테고리 기반으로 다른 팀/담당자 매칭
  - 매칭 가능 → { type: 'route_to_l2', agentId }
  - 매칭 불가 → { type: 'escalate_to_l1' }
```

---

## 2. 모델 라우팅 로직

### 2.1 라우팅 규칙

| 조건 | 선택 모델 | 모델명 |
|---|---|---|
| 텍스트만 (첨부 없음) | lightweight | Claude Haiku |
| 첨부파일 있음 (이미지/PDF/워드/엑셀 등) | heavy | Claude Opus |
| transformToPublic 호출 | lightweight | Claude Haiku |
| suggestCategory 호출 | lightweight | Claude Haiku |
| 합성 데이터 생성 | lightweight | Claude Haiku |

### 2.2 첨부파일 판별

```typescript
function routeToModel(input: ModelRouteInput): ModelType {
  if (input.attachments && input.attachments.length > 0) {
    return 'heavy';
  }
  return 'lightweight';
}
```

---

## 3. 신뢰도 산출 로직

### 3.1 산출 방식
- Bedrock Knowledge Base `Retrieve` API가 반환하는 각 결과의 `score` 필드 활용
- 상위 10건의 score 평균값 = confidence

### 3.2 산출 공식

```typescript
function assessConfidence(ragResults: RAGResult[]): number {
  if (ragResults.length === 0) return 0;
  const totalScore = ragResults.reduce((sum, r) => sum + r.score, 0);
  return totalScore / ragResults.length;
}
```

### 3.3 임계값
- 기본값: **0.8** (80%)
- 관리자가 설정 화면에서 변경 가능 (환경 변수 또는 DB 설정)

---

## 4. 라우팅 판정 로직

### 4.1 판정 규칙

```typescript
function determineRouting(confidence: number, ragResults: RAGResult[]): RoutingDecision {
  const threshold = getConfidenceThreshold(); // 기본 0.8

  if (confidence >= threshold) {
    return { type: 'ai_answer', answer: generatedAnswer };
  }

  // 카테고리 기반 2차 분배 시도
  const matchedAgent = findAgentByCategory(suggestedCategories);
  if (matchedAgent) {
    return { type: 'route_to_l2', agentId: matchedAgent.id, reason: '카테고리 매칭' };
  }

  // 매칭 실패 → 1차 처리자 큐
  return { type: 'escalate_to_l1' };
}
```

### 4.2 카테고리 → 팀 매핑

카테고리는 사전 정의된 목록(closed set)이며, 각 카테고리는 담당 팀과 매핑됩니다.
분배 시 해당 팀의 활성 agent_l2 사용자 중 한 명에게 배정합니다.

---

## 5. transformToPublic 로직

### 5.1 변환 규칙
1. **호칭/지칭 변경**: 내부 호칭(김과장님, 이대리) → 일반 호칭(담당자)
2. **내부 시스템명 제거**: SAP, Jira 내부 인스턴스명 등 → "시스템", "관리 도구"
3. **문체 통일**: 딱딱한 내부 문체 → 친절한 고객 응대 문체
4. **⚠️ 절대 금지**: 사실, 정보, 지시사항, 절차 내용 변경

### 5.2 사용 모델
- **lightweight (Claude Haiku)** — 비용 효율적, 단순 텍스트 변환에 적합

### 5.3 프롬프트 구조

```
당신은 IT Help Desk 고객 응대 전문가입니다.
아래 내부 답변을 고객에게 전달할 수 있는 형태로 변환하세요.

[변환 규칙]
- 내부 호칭(직급, 이름)을 일반 호칭으로 변경
- 내부 시스템명이나 프로세스명을 일반적인 표현으로 대체
- 문체를 친절하고 정중한 고객 응대 문체로 통일
- ⚠️ 절대 금지: 답변의 사실적 내용, 정보, 지시사항, 절차를 변경하지 마세요

[내부 답변]
{privateMessage.content}

[변환된 답변]
```

---

## 6. 응답 시간 요구사항

| 작업 | 모델 | 목표 시간 |
|---|---|---|
| generateAnswer (텍스트) | lightweight (Haiku) | 10초 이내 |
| generateAnswer (첨부) | heavy (Opus) | 5분 이내 |
| transformToPublic | lightweight (Haiku) | 10초 이내 |
| suggestCategory | lightweight (Haiku) | 10초 이내 |

---

## 7. 에러 핸들링

### 7.1 재시도 전략
- 최대 **2회 재시도** (exponential backoff: 1초 → 2초)
- 재시도 실패 시 → `{ type: 'escalate_to_l1' }` 반환 (fail-closed)

### 7.2 에러 시나리오

| 에러 | 처리 |
|---|---|
| Bedrock API 타임아웃 | 재시도 2회 → escalate_to_l1 |
| KB 검색 결과 0건 | confidence = 0 → escalate_to_l1 |
| LLM 응답 파싱 실패 | 재시도 2회 → escalate_to_l1 |
| transformToPublic 실패 | 원본 Private 메시지 그대로 반환 (내용 보존 우선) |
