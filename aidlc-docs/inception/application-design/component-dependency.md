# Component Dependency & Communication

## 의존성 매트릭스

| 호출자 ↓ / 피호출자 → | TicketSvc | AISvc | EmailSvc | AuthSvc | AdminSvc | AnalyticsSvc | FeedbackSvc |
|---|---|---|---|---|---|---|---|
| **Frontend (API Routes)** | ✅ | - | - | ✅ | ✅ | ✅ | ✅ |
| **TicketService** | - | ✅ | ✅(async) | - | - | - | ✅(async) |
| **AIService** | - | - | - | - | - | - | - |
| **EmailService** | ✅ | - | - | - | - | - | - |
| **AuthService** | - | - | - | - | - | - | - |
| **AdminService** | - | - | - | - | - | - | - |
| **AnalyticsService** | - | - | - | - | - | - | - |
| **FeedbackService** | - | - | - | - | - | - | - |

**핵심 의존 방향:**
- Frontend → 모든 서비스 (API Routes를 통해)
- TicketService → AIService (답변 생성, 분배 판정)
- TicketService → EmailService (이메일 발송, 비동기)
- TicketService → FeedbackService (학습 데이터 누적, 비동기)
- EmailService → TicketService (인바운드 이메일 → 티켓 생성/메시지 추가)

---

## 통신 패턴 다이어그램

```
+----------+     REST      +----------+     REST      +----------+
| Frontend | ------------> | Ticket   | ------------> | AI/RAG   |
| (Pages)  |              | Service  |              | Service  |
+----------+              +----------+              +----------+
     |                         |
     | REST                    | Event (SQS)
     v                         v
+----------+              +----------+
| Auth     |              | Email    |
| Service  |              | Service  |
+----------+              +----------+
     |                         ^
     | REST                    | Event (SES→Lambda→SQS)
     v                         |
+----------+              [Inbound Email]
| Admin    |
| Service  |
+----------+
     |
     | REST
     v
+----------+
| Analytics|
| Service  |
+----------+
```

---

## 이벤트 기반 통신 (SQS)

### 이벤트 목록

| 이벤트 | Producer | Consumer | 설명 |
|---|---|---|---|
| `ticket.created` | TicketService | - | 티켓 생성됨 |
| `ticket.resolved` | TicketService | FeedbackService | 티켓 해결 → 학습 데이터 누적 |
| `message.private.created` | TicketService | AIService | 2차 Private 답변 → Public 변환 |
| `assignment.rejected` | TicketService | AIService | "본인 아님" → 재분배 판정 |
| `email.inbound` | SES/Lambda | EmailService | 인바운드 이메일 수신 |
| `email.outbound` | TicketService | EmailService | Public 답변 이메일 발송 |
| `llm.usage` | AIService | AnalyticsService | LLM 호출 로그 저장 |
| `kb.reindex` | FeedbackService | AI/RAG (Bedrock) | KB 재색인 트리거 |

### SQS 큐 구성

| 큐 이름 | 용도 |
|---|---|
| `helpdesk-email-inbound` | 인바운드 이메일 처리 |
| `helpdesk-email-outbound` | 아웃바운드 이메일 발송 |
| `helpdesk-llm-logging` | LLM 사용 로그 비동기 저장 |
| `helpdesk-feedback-accumulate` | 학습 데이터 누적 |
| `helpdesk-assignment-events` | 분배/재분배 이벤트 |
| `helpdesk-kb-reindex` | KB 재색인 트리거 |

---

## 공유 인터페이스 (shared/)

### 공유 타입 정의

```typescript
// shared/types/ticket.ts
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high';
type CreatedVia = 'web' | 'email';
type ResolutionType = 'ai_auto' | 'agent_l1' | 'agent_l2';

// shared/types/message.ts
type MessageVisibility = 'public' | 'private';
type MessageSource = 'web' | 'email' | 'ai_generated';
type SenderType = 'user' | 'agent_l1' | 'agent_l2' | 'ai' | 'system';

// shared/types/user.ts
type UserRole = 'employee' | 'agent_l1' | 'agent_l2' | 'admin';

// shared/types/assignment.ts
type AssignmentType = 'ai_auto' | 'manual' | 'reassign';
type AssignmentStatus = 'active' | 'rejected' | 'completed';

// shared/types/llm.ts
type ModelType = 'lightweight' | 'heavy';
type RequestType = 'answer_gen' | 'routing' | 'category' | 'synthesis' | 'public_transform';

// shared/types/events.ts
interface TicketEvent { ticketId: string; type: string; payload: unknown; timestamp: string; }
```

---

## 디렉토리 구조

```
/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 인증 관련 페이지
│   │   │   └── login/
│   │   ├── (employee)/               # 임직원 페이지
│   │   │   ├── tickets/
│   │   │   └── new-ticket/
│   │   ├── (agent)/                  # 처리자 페이지
│   │   │   ├── queue/
│   │   │   └── tickets/
│   │   ├── (admin)/                  # 관리자 페이지
│   │   │   ├── dashboard/
│   │   │   ├── statistics/
│   │   │   ├── users/
│   │   │   └── settings/
│   │   └── api/                      # API Routes
│   │       ├── tickets/
│   │       ├── messages/
│   │       ├── auth/
│   │       ├── admin/
│   │       ├── analytics/
│   │       ├── feedback/
│   │       └── webhooks/             # SES 인바운드 등
│   ├── services/                     # Service Layer
│   │   ├── ticket.service.ts         # Unit 2
│   │   ├── ai.service.ts             # Unit 3
│   │   ├── email.service.ts          # Unit 2
│   │   ├── auth.service.ts           # Unit 4
│   │   ├── admin.service.ts          # Unit 4
│   │   ├── analytics.service.ts      # Unit 4
│   │   ├── feedback.service.ts       # Unit 4
│   │   └── data-pipeline.service.ts  # Unit 3
│   ├── repositories/                 # Repository Layer (Prisma)
│   │   ├── ticket.repository.ts
│   │   ├── message.repository.ts
│   │   ├── user.repository.ts
│   │   └── ...
│   ├── shared/                       # 공유 타입/유틸 (모든 유닛 참조)
│   │   ├── types/
│   │   ├── constants/
│   │   ├── utils/
│   │   └── middleware/
│   ├── components/                   # React 공유 컴포넌트 (Unit 1)
│   │   ├── ui/
│   │   ├── layout/
│   │   └── forms/
│   └── lib/                          # 외부 SDK 래퍼
│       ├── bedrock.ts                # Unit 3
│       ├── ses.ts                    # Unit 2
│       └── prisma.ts                 # 공유
├── prisma/
│   ├── schema.prisma                 # DB 스키마
│   └── migrations/
├── scripts/
│   └── data-pipeline/                # 합성 데이터 배치 (Unit 3)
├── infra/                            # Terraform (Unit 5)
│   ├── modules/
│   ├── environments/
│   └── main.tf
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── next.config.js
├── tsconfig.json
└── docker-compose.yml                # 로컬 개발용
```

---

## 유닛별 작업 영역 (충돌 방지)

| Unit | 전용 영역 | 공유 영역 (읽기만) |
|---|---|---|
| Unit 1 (Frontend) | `src/app/`, `src/components/` | `src/shared/types/` |
| Unit 2 (Intake & Routing) | `src/services/ticket.*`, `src/services/email.*`, `src/app/api/tickets/`, `src/app/api/messages/`, `src/app/api/webhooks/` | `src/shared/`, `src/lib/ses.ts` |
| Unit 3 (AI/RAG) | `src/services/ai.*`, `src/services/data-pipeline.*`, `scripts/data-pipeline/`, `src/lib/bedrock.ts` | `src/shared/` |
| Unit 4 (Admin & Analytics) | `src/services/auth.*`, `src/services/admin.*`, `src/services/analytics.*`, `src/services/feedback.*`, `src/app/api/auth/`, `src/app/api/admin/`, `src/app/api/analytics/`, `src/app/api/feedback/` | `src/shared/` |
| Unit 5 (Infrastructure) | `infra/`, `docker-compose.yml`, `prisma/` | - |

**규칙**: `src/shared/`는 Application Design에서 확정된 내용. 변경 시 전체 합의 필요.
