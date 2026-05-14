# Code Generation Plan - Unit 2: Intake & Routing

## Unit Context

### 담당 영역
- 티켓 CRUD, 메시지 관리, 분배 엔진, 이메일 파싱/발송
- Next.js API Routes, Prisma ORM, Amazon SES SDK

### 소유 테이블
- tickets, messages, ticket_assignments, email_threads

### 의존성
- AIService (Unit 3) — 답변 생성, 분배 판정 호출 (인터페이스만 정의, 구현은 Unit 3)
- UserRepository (Unit 4) — 사용자 조회 (인터페이스만 정의)
- `src/shared/types/` — 공유 타입

### 구현 스토리
- US-1.1: 웹 화면 문의 입력 (API)
- US-1.4: 답변 불가 시 내부 에스컬레이션 (로직)
- US-2.1: 본인 문의 목록 조회 (API)
- US-2.2: 티켓 상세 조회 (API, visibility 필터)
- US-3.1: 미처리 문의 큐 확인 (API)
- US-3.2: 직접 답변 작성 (API, Public/Private 검증)
- US-3.3: 2차 처리자에게 수동 분배 (API)
- US-4.1: 분배된 문의 수신 (API)
- US-4.2: Private 답변 작성 (API)
- US-4.3: "본인 업무 아님" 처리 (API, 재분배 로직)
- US-5.1: 이메일 문의 자동 인입
- US-5.2: 이메일 스레드 기반 티켓 식별
- US-5.3: 최종 답변 후 재문의 처리
- US-5.4: 이메일 답변 발송 (Private 차단)

---

## Code Generation Steps

### Step 1: 공유 타입 정의
- [ ] `src/shared/types/index.ts` — 공통 타입 (UserRole, TicketStatus, etc.)
- [ ] `src/shared/types/api.ts` — API 응답 래핑 타입 (ApiResponse, PaginatedResult)
- [ ] `src/shared/types/ticket.ts` — 티켓 관련 DTO
- [ ] `src/shared/types/message.ts` — 메시지 관련 DTO
- [ ] `src/shared/types/ai-service.ts` — AIService 인터페이스 (Unit 3 계약)

### Step 2: 공유 유틸리티
- [ ] `src/shared/utils/api-response.ts` — 성공/실패 응답 헬퍼
- [ ] `src/shared/utils/pagination.ts` — 페이지네이션 유틸
- [ ] `src/shared/utils/ticket-number.ts` — 티켓 번호 생성기

### Step 3: Repository 레이어
- [ ] `src/repositories/ticket.repository.ts` — 티켓 CRUD
- [ ] `src/repositories/message.repository.ts` — 메시지 CRUD
- [ ] `src/repositories/assignment.repository.ts` — 분배 이력 CRUD
- [ ] `src/repositories/email-thread.repository.ts` — 이메일 스레드 CRUD
- [ ] `src/repositories/user.repository.ts` — 사용자 조회 (Unit 4 계약)

### Step 4: Service 레이어 — TicketService
- [ ] `src/services/ticket.service.ts` — 핵심 비즈니스 로직
  - createTicket (AI 호출 포함)
  - getTicketById (visibility 필터)
  - getMyTickets
  - getAssignedTickets
  - getUnassignedQueue
  - updateStatus
  - assignTicket (수동 분배)
  - rejectAssignment (재분배)

### Step 5: Service 레이어 — MessageService
- [ ] `src/services/message.service.ts` — 메시지 비즈니스 로직
  - addMessage (visibility 검증, agent_l2 → private 강제)
  - Private→Public 변환 트리거

### Step 6: Service 레이어 — EmailService
- [ ] `src/services/email.service.ts` — 이메일 처리
  - parseInboundEmail
  - identifyThread
  - sendReply (Private 차단 검증)
  - validatePrivateBlock

### Step 7: AIService 인터페이스 (Stub)
- [ ] `src/services/ai.service.ts` — Unit 3 구현 전 stub
  - generateAnswer (stub: 기본 응답 반환)
  - determineRouting (stub: escalate_to_l1 반환)
  - suggestCategory (stub: 빈 배열)
  - transformToPublic (stub: 원본 반환)

### Step 8: API Routes — Tickets
- [ ] `src/app/api/tickets/route.ts` — POST /api/tickets (생성)
- [ ] `src/app/api/tickets/my/route.ts` — GET /api/tickets/my
- [ ] `src/app/api/tickets/[id]/route.ts` — GET /api/tickets/:id
- [ ] `src/app/api/tickets/queue/route.ts` — GET /api/tickets/queue
- [ ] `src/app/api/tickets/assigned/route.ts` — GET /api/tickets/assigned
- [ ] `src/app/api/tickets/assign/route.ts` — POST /api/tickets/assign
- [ ] `src/app/api/tickets/reject/route.ts` — POST /api/tickets/reject

### Step 9: API Routes — Messages
- [ ] `src/app/api/messages/route.ts` — POST /api/messages

### Step 10: API Routes — Webhooks (이메일 인바운드)
- [ ] `src/app/api/webhooks/ses-inbound/route.ts` — POST (SES 이메일 수신)

### Step 11: 미들웨어 및 인증 헬퍼
- [ ] `src/shared/middleware/auth.ts` — JWT 검증 + 역할 체크 헬퍼 (Unit 4 구현 전 stub)

### Step 12: Documentation
- [ ] `aidlc-docs/construction/intake-routing/code/code-summary.md` — 코드 요약 문서

---

## 디렉토리 구조 (최종)

```
helpdesk-ai/src/
├── shared/
│   ├── types/
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── ticket.ts
│   │   ├── message.ts
│   │   └── ai-service.ts
│   ├── utils/
│   │   ├── api-response.ts
│   │   ├── pagination.ts
│   │   └── ticket-number.ts
│   └── middleware/
│       └── auth.ts
├── repositories/
│   ├── ticket.repository.ts
│   ├── message.repository.ts
│   ├── assignment.repository.ts
│   ├── email-thread.repository.ts
│   └── user.repository.ts
├── services/
│   ├── ticket.service.ts
│   ├── message.service.ts
│   ├── email.service.ts
│   └── ai.service.ts
└── app/api/
    ├── tickets/
    │   ├── route.ts
    │   ├── my/route.ts
    │   ├── [id]/route.ts
    │   ├── queue/route.ts
    │   ├── assigned/route.ts
    │   ├── assign/route.ts
    │   └── reject/route.ts
    ├── messages/
    │   └── route.ts
    └── webhooks/
        └── ses-inbound/route.ts
```
