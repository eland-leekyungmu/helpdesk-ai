# Services Design

## 서비스 레이어 구조

Next.js API Routes → Service Layer → Repository Layer → PostgreSQL

```
API Routes (/api/*)
       |
       v
+------------------------------------------+
|          Service Layer                    |
|                                          |
|  TicketService    AIService              |
|  EmailService     AuthService            |
|  AdminService     AnalyticsService       |
|  FeedbackService  DataPipelineService    |
+------------------------------------------+
       |
       v
+------------------------------------------+
|          Repository Layer (Prisma)       |
+------------------------------------------+
       |
       v
    PostgreSQL (RDS)
```

---

## 서비스 정의

### 1. TicketService
**책임**: 티켓 생명주기 관리, 메시지 관리, 분배 로직

| 메서드 | 설명 | 통신 |
|---|---|---|
| createTicket() | 신규 티켓 생성 (웹/이메일) | 동기 |
| getTicketById() | 티켓 상세 조회 (역할별 visibility 필터) | 동기 |
| getMyTickets() | 요청자 본인 티켓 목록 | 동기 |
| getAssignedTickets() | 처리자 담당 건 목록 | 동기 |
| getUnassignedQueue() | 1차 처리자 미처리 큐 | 동기 |
| addMessage() | 메시지 추가 (visibility 검증) | 동기 |
| updateStatus() | 티켓 상태 변경 | 동기 |
| assignTicket() | 수동 분배 (1차→2차) | 동기 |
| rejectAssignment() | "본인 아님" 처리 | 동기 → 이벤트(재분배) |

### 2. AIService
**책임**: RAG 검색, LLM 호출, 답변 생성, 라우팅 판정

| 메서드 | 설명 | 통신 |
|---|---|---|
| generateAnswer() | RAG 기반 답변 생성 | 동기 |
| assessConfidence() | 신뢰도 점수 산출 | 동기 |
| routeToModel() | 입력 유형별 LLM 모델 선택 | 동기 |
| suggestCategory() | 카테고리 추천 | 동기 |
| determineRouting() | 1차 답변 / 2차 분배 / Fallback 판정 | 동기 |
| transformToPublic() | 2차 Private → Public 가공 (문맥만 수정) | 동기 |
| logUsage() | LLM 호출 로그 저장 | 비동기(이벤트) |

### 3. EmailService
**책임**: 이메일 인바운드 파싱, 아웃바운드 발송, 스레드 관리

| 메서드 | 설명 | 통신 |
|---|---|---|
| parseInboundEmail() | 수신 이메일 파싱 (SES → Lambda 트리거) | 비동기(이벤트) |
| identifyThread() | 이메일 헤더 기반 티켓 매칭 | 동기 |
| sendReply() | 답변 이메일 발송 (Public만) | 비동기(이벤트) |
| validatePrivateBlock() | Private 메시지 발송 차단 검증 | 동기 |

### 4. AuthService
**책임**: 인증, 세션, 권한 검증

| 메서드 | 설명 | 통신 |
|---|---|---|
| login() | 로그인 (이메일+비밀번호) | 동기 |
| logout() | 로그아웃 | 동기 |
| validateToken() | JWT 토큰 검증 | 동기 |
| checkRole() | 역할 기반 접근 제어 | 동기 |
| incrementLoginAttempt() | 로그인 실패 카운트 | 동기 |

### 5. AdminService
**책임**: 담당자/부서 관리, 시스템 설정

| 메서드 | 설명 | 통신 |
|---|---|---|
| createUser() | 사용자 생성 | 동기 |
| updateUser() | 사용자 수정 | 동기 |
| deleteUser() | 사용자 비활성화 | 동기 |
| manageDepartments() | 부서 CRUD | 동기 |
| getAgentList() | 2차 처리자 목록 (분배용) | 동기 |
| updateConfidenceThreshold() | 신뢰도 임계값 설정 | 동기 |

### 6. AnalyticsService
**책임**: 통계 집계, KPI 산출, LLM 비용 통계

| 메서드 | 설명 | 통신 |
|---|---|---|
| getResolutionRate() | 1차 AI 해결률 | 동기 |
| getRoutingAccuracy() | 2차 분배 성공률 | 동기 |
| getProcessingTime() | 처리 시간 분포 | 동기 |
| getLLMCostStats() | LLM 비용 통계 (모델별/기간별) | 동기 |
| getTicketStats() | 티켓 현황 집계 | 동기 |
| getDepartmentStats() | 부서/담당자별 통계 | 동기 |

### 7. FeedbackService
**책임**: 피드백 수집, 학습 데이터 관리, KB 재색인

| 메서드 | 설명 | 통신 |
|---|---|---|
| submitFeedback() | 👍/👎 피드백 저장 | 동기 |
| accumulateLearningData() | 완료 티켓 → KB 엔트리 변환 | 비동기(이벤트) |
| triggerReindex() | KB 재색인 트리거 | 비동기(이벤트) |

### 8. DataPipelineService
**책임**: 합성 데이터 생성 (일회성 배치)

| 메서드 | 설명 | 통신 |
|---|---|---|
| loadSourceData() | 실 데이터 로드 | 배치 |
| generateSynthetic() | LLM 기반 합성 데이터 생성 | 배치 |
| validateQuality() | 품질 검증 (중복, 형식, 카테고리) | 배치 |
| loadToKB() | KB 적재 | 배치 |

---

## 통신 패턴

### 동기 (REST API 직접 호출)
- 사용자 요청 → 응답이 필요한 모든 흐름
- 티켓 조회, 메시지 추가, 로그인, 통계 조회

### 비동기 (SQS/SNS 이벤트)
- 이메일 인바운드 파싱 (SES → S3 → Lambda → SQS → 처리)
- 이메일 아웃바운드 발송 (답변 완료 이벤트 → SQS → 발송)
- LLM 사용 로그 저장 (호출 완료 이벤트 → SQS → 저장)
- 피드백 학습 데이터 누적 (티켓 완료 이벤트 → SQS → KB 엔트리 생성)
- "본인 아님" 재분배 (거절 이벤트 → SQS → AI 재분배)
- KB 재색인 (트리거 이벤트 → SQS → Bedrock KB sync)

---

## 핵심 오케스트레이션 흐름

### 문의 접수 → AI 응답 흐름
```
1. TicketService.createTicket()
2. AIService.routeToModel() — 입력 유형 판별
3. AIService.generateAnswer() — RAG 검색 + LLM 답변
4. AIService.assessConfidence() — 신뢰도 판정
5a. 신뢰도 >= 임계값 → TicketService.addMessage(public, ai) → 완료
5b. 2차 분배 판정 → TicketService.assignTicket(auto) → 2차 처리자에게 분배
5c. 신뢰도 < 임계값 → 1차 처리자 큐에 추가 (요청자 안내 없음)
6. [비동기] AIService.logUsage() — 비용 로그
```

### 2차 처리자 답변 → 요청자 전달 흐름
```
1. TicketService.addMessage(private, agent_l2) — 2차 처리자 Private 작성
2. AIService.transformToPublic() — 문맥만 수정, 내용 변경 금지
3. TicketService.addMessage(public, ai) — Public 메시지 생성 (ai_original_id 참조)
4. [비동기] EmailService.sendReply() — 이메일 접수 건이면 이메일 발송
```
