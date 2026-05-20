# IT Help Desk AI 서비스

AI 기반 IT Help Desk 자동 응답 및 티켓 분배 시스템입니다.  
임직원의 IT 문의를 RAG(Retrieval-Augmented Generation) 기반으로 자동 답변하고, 신뢰도에 따라 적절한 담당자에게 자동 분배합니다.

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트 유형** | Greenfield (신규 개발) |
| **개발 방법론** | AI-DLC (AI-Driven Development Life Cycle) |
| **개발 도구** | Kiro IDE + Claude (AI 코딩 에이전트) |
| **개발 기간** | 2026.05.11 ~ 2026.05.20 |
| **대상 사용자** | 임직원 5,000명 규모 |

---

## 주요 기능

### 1. AI 자동 응답 (RAG 기반)
- AWS Bedrock Knowledge Base를 활용한 유사 문의-답변 검색
- 신뢰도 점수 기반 자동 답변 여부 판정 (임계값 설정 가능)
- 텍스트 전용 → 경량 모델, 첨부파일 포함 → 고성능 멀티모달 모델 자동 라우팅
- 답변 근거(출처 문서, 유사도 점수) 표시

### 2. 지능형 티켓 분배
- AI 의도 분석 → 카테고리/부서/팀 자동 분류
- 신뢰도 높음: AI 직접 답변 → 티켓 자동 완료
- 신뢰도 낮음 + 2차 처리 가능: 해당 팀 2차 처리자에게 자동 배정
- 신뢰도 낮음 + 분배 불가: 1차 처리자 큐로 에스컬레이션

### 3. 역할 기반 처리 워크플로우
- **임직원(employee)**: 문의 등록, 내 티켓 조회, AI 답변 피드백
- **1차 처리자(agent_l1)**: 미처리 큐 관리, 수동 분배, 직접 답변
- **2차 처리자(agent_l2)**: Private 전용 응답 → AI가 Public으로 자동 변환
- **관리자(admin)**: 사용자/조직 관리, 통계 대시보드, KB 관리

### 4. Public/Private 메시지 분리
- 2차 처리자는 Private으로만 작성 (내부 전문 용어 사용 가능)
- AI가 Private 내용을 고객 친화적 Public 메시지로 자동 변환
- 임직원은 Public 메시지만 조회 가능

### 5. 피드백 루프 + 자동 학습
- 👍/👎 피드백 → 티켓 자동 종료
- 긍정 피드백 시 질문-답변 쌍을 KB에 자동 적재
- 관리자 재색인 트리거 → S3 업로드 → Bedrock Ingestion

### 6. 관리자 대시보드
- 1차 AI 해결률, 분배 성공률, 평균 처리 시간
- LLM 비용 통계 (모델별/기간별)
- 부서별/법인별 문의 건수 집계
- 일별 티켓 추이 차트

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 |
| **Backend** | Next.js API Routes (풀스택) |
| **Database** | PostgreSQL 15 (AWS RDS) |
| **ORM** | Prisma 7 |
| **AI/RAG** | AWS Bedrock (Claude Sonnet 4) + Knowledge Base |
| **Storage** | AWS S3 (첨부파일 + KB 문서) |
| **Email** | Amazon SES (인바운드 파싱) |
| **인증** | JWT + bcrypt (자체 구현) |
| **IaC** | Terraform (모듈화) |
| **테스트** | Vitest |
| **컨테이너** | Docker + docker-compose |
| **차트** | Recharts |

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Employee │  │ Agent L1 │  │ Agent L2 │  │  Admin   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼──────────────┼──────────────┼──────────────┼────────┘
        │              │              │              │
┌───────▼──────────────▼──────────────▼──────────────▼────────┐
│                    API Routes (Next.js)                       │
│  /api/auth  /api/tickets  /api/messages  /api/admin          │
│  /api/ai    /api/feedback /api/analytics /api/attachments    │
└───────┬──────────────┬──────────────┬──────────────┬────────┘
        │              │              │              │
┌───────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐ ┌────▼─────┐
│  Auth Svc    │ │Ticket Svc│ │  AI Svc    │ │Admin Svc │
│  (JWT+bcrypt)│ │(CRUD+분배)│ │(RAG+LLM)  │ │(CRUD+통계)│
└───────┬──────┘ └────┬─────┘ └─────┬──────┘ └────┬─────┘
        │              │              │              │
┌───────▼──────────────▼──────────────▼──────────────▼────────┐
│                    PostgreSQL (RDS)                           │
│  users, tickets, messages, assignments, feedbacks,           │
│  llm_usage_logs, knowledge_base_entries, system_configs      │
└─────────────────────────────────────────────────────────────┘
        │                             │
┌───────▼──────┐              ┌──────▼───────┐
│   AWS S3     │              │ AWS Bedrock  │
│ (첨부파일,KB)│              │ (LLM + KB)   │
└──────────────┘              └──────────────┘
```

---

## 프로젝트 구조

```
aidlc-aws/
├── README.md                    # 본 문서
├── aidlc-docs/                  # AI-DLC 산출물 (설계 문서, 계획, 감사 로그)
│   ├── inception/               # 요구사항, 유저스토리, 설계
│   ├── construction/            # 기능설계, NFR, 인프라, 코드 생성 계획
│   ├── aidlc-state.md           # 워크플로우 진행 상태
│   └── audit.md                 # 전체 의사결정 감사 로그
│
└── helpdesk-ai/                 # 애플리케이션 소스 코드
    ├── src/
    │   ├── app/                 # Next.js App Router
    │   │   ├── (admin)/         # 관리자 페이지
    │   │   ├── (agent)/         # 처리자 페이지
    │   │   ├── (auth)/          # 인증 페이지
    │   │   ├── (employee)/      # 임직원 페이지
    │   │   └── api/             # REST API 엔드포인트
    │   ├── components/          # UI 컴포넌트 (layout, forms, ui)
    │   ├── lib/                 # 외부 서비스 연동 (Bedrock, S3, Prisma)
    │   ├── repositories/        # 데이터 접근 계층
    │   ├── services/            # 비즈니스 로직 계층
    │   └── shared/              # 공통 (types, constants, middleware, utils)
    ├── tests/                   # 테스트 (unit, integration, e2e)
    ├── prisma/                  # DB 스키마
    ├── infra/                   # Terraform IaC (모듈화)
    ├── scripts/                 # 유틸리티 스크립트
    ├── Dockerfile               # 컨테이너 빌드
    └── docker-compose.yml       # 로컬 개발 환경
```

---

## 실행 방법

### 사전 요구사항
- Node.js 20+
- PostgreSQL 15+ (또는 AWS RDS 접속 정보)
- AWS 자격 증명 (Bedrock, S3 접근)

### 1. 의존성 설치
```bash
cd helpdesk-ai
npm install
```

### 2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일에 DB 접속 정보, AWS 키, Bedrock KB ID 등 입력
```

### 3. Prisma Client 생성 + DB 동기화
```bash
npx prisma generate
npx prisma db push
```

### 4. 개발 서버 실행
```bash
npm run dev
# → http://localhost:3000
```

### 5. 프로덕션 빌드
```bash
npm run build
npm start
```

### 6. Docker 실행
```bash
docker-compose up --build
```

---

## 테스트

```bash
# 단위 테스트
npm test

# 통합 테스트 (AWS 자격 증명 필요)
INTEGRATION=true npx vitest --run tests/integration/

# 커버리지
npx vitest --run --coverage
```

---

## API 엔드포인트 요약

| Method | Path | 설명 | 허용 역할 |
|--------|------|------|-----------|
| POST | /api/auth/login | 로그인 (JWT 발급) | 전체 |
| POST | /api/auth/logout | 로그아웃 | 전체 |
| GET | /api/auth/me | 내 정보 조회 | 전체 |
| POST | /api/tickets | 티켓 생성 + AI 자동 응답 | employee, agent_l1 |
| GET | /api/tickets/my | 내 티켓 목록 | employee |
| GET | /api/tickets/queue | 미처리 큐 | agent_l1 |
| GET | /api/tickets/assigned | 담당 티켓 | agent_l1, agent_l2 |
| GET | /api/tickets/[id] | 티켓 상세 | 전체 (권한 필터) |
| POST | /api/tickets/assign | 수동 분배 | agent_l1 |
| POST | /api/tickets/reject | 분배 거절 + 재분배 | agent_l2 |
| POST | /api/messages | 메시지 추가 | employee, agent_l1, agent_l2 |
| POST | /api/feedback | 피드백 제출 (👍/👎) | employee |
| POST | /api/feedback/reindex | KB 재색인 트리거 | admin |
| GET | /api/analytics | 종합 통계 | admin |
| GET | /api/analytics/kpi | KPI 지표 | admin |
| GET | /api/analytics/llm-cost | LLM 비용 통계 | admin |
| POST | /api/attachments/upload | 파일 업로드 (S3) | 전체 |
| GET | /api/attachments/download | 파일 다운로드 (Presigned URL) | 전체 |
| * | /api/admin/* | 사용자/조직/설정 관리 | admin |

---

## 데이터 모델 (주요 엔티티)

| 엔티티 | 설명 |
|--------|------|
| User | 사용자 (employee, agent_l1, agent_l2, admin) |
| Organization | 법인 |
| Department | 부서 |
| Team | 팀 |
| Ticket | 문의 티켓 |
| Message | 메시지 (public/private) |
| TicketAssignment | 분배 이력 |
| Feedback | 답변 피드백 (👍/👎) |
| LlmUsageLog | LLM 호출 비용 로그 |
| KnowledgeBaseEntry | KB 학습 데이터 |
| SystemConfig | 시스템 설정 (신뢰도 임계값 등) |

---

## AI-DLC 개발 프로세스

본 프로젝트는 **AI-DLC(AI-Driven Development Life Cycle)** 방법론을 적용하여 개발되었습니다.

### 진행 단계

| 단계 | 상태 | 산출물 |
|------|------|--------|
| Workspace Detection | ✅ 완료 | aidlc-state.md |
| Requirements Analysis | ✅ 완료 | requirements.md |
| User Stories | ✅ 완료 | user-stories.md, personas.md |
| Workflow Planning | ✅ 완료 | workflow-plan.md |
| Application Design | ✅ 완료 | components.md, database-design.md 등 |
| Units Generation | ✅ 완료 | unit-of-work.md (5개 유닛) |
| Design 통합 | ✅ 완료 | functional-design, nfr, infrastructure |
| Code Generation (Unit 1~5) | ✅ 완료 | 전체 소스 코드 |
| Build and Test | ✅ 완료 | build-and-test/ 산출물 |

### 유닛 구성

| Unit | 담당 영역 | 주요 파일 |
|------|-----------|-----------|
| Unit 1 | Frontend (UI) | src/app/, src/components/ |
| Unit 2 | Intake & Routing | ticket.service, message.service, repositories |
| Unit 3 | AI/RAG | ai.service, bedrock.ts, data-pipeline |
| Unit 4 | Admin & Analytics | admin.service, analytics.service, feedback |
| Unit 5 | Infrastructure | infra/ (Terraform), Docker, CI/CD |

---

## 사용한 AI 도구

| 도구 | 용도 |
|------|------|
| **Kiro IDE** | AI-DLC 워크플로우 실행, 코드 생성, 리팩토링 |
| **Claude (Anthropic)** | 요구사항 분석, 설계, 코드 생성, 버그 수정, 문서 작성 |
| **AWS Bedrock (Claude Sonnet 4)** | 런타임 AI 기능 (RAG 답변 생성, 의도 분석, 메시지 변환) |
| **AWS Bedrock Knowledge Base** | RAG 검색 엔진 (벡터 DB 기반 유사 문서 검색) |

### AI 활용 범위
- **설계 단계**: 요구사항 정의, 유저스토리 작성, 아키텍처 설계, DB 모델링
- **구현 단계**: 전체 소스 코드 생성 (프론트엔드 + 백엔드 + 인프라)
- **테스트 단계**: 테스트 시나리오 설계, 단위/통합 테스트 코드 작성
- **운영 단계**: 버그 수정, 기능 개선, API 연동 (총 17건 미니 사이클)

---

## 보안 고려사항

- JWT 기반 인증 + 역할별 접근 제어 (RBAC)
- 비밀번호 bcrypt 해싱
- 로그인 시도 5회 제한 + 30분 계정 잠금
- Private 메시지 서버 측 필터링 (임직원 노출 차단)
- Prisma parameterized query (SQL Injection 방지)
- 환경변수 기반 시크릿 관리 (.env)
- S3 Presigned URL 기반 파일 접근 제어

---

## 라이선스

Private Repository - 내부 사용 전용
