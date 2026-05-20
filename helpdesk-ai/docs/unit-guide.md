# Unit 개발 가이드

> 각 유닛 담당자는 이 문서를 읽고 본인 유닛의 범위와 규칙을 파악한 후 개발을 시작하세요.
> API 형태는 `docs/api-spec.md`를 참고하세요.

---

## 프로젝트 구조 요약

```
helpdesk-ai/
├── src/
│   ├── app/                    ← Unit 1 (페이지)
│   │   ├── (auth)/login/
│   │   ├── (employee)/         ← 임직원 화면
│   │   ├── (agent)/            ← 처리자 화면
│   │   ├── (admin)/            ← 관리자 화면
│   │   └── api/                ← Unit 2, 4 (API Routes)
│   ├── services/               ← Unit 2, 3, 4 (비즈니스 로직)
│   ├── repositories/           ← Unit 2, 4 (DB 접근)
│   ├── components/             ← Unit 1 (UI 컴포넌트)
│   ├── shared/                 ← 공유 (타입, 상수, 미들웨어)
│   └── lib/                    ← 공유 (Prisma, SDK 래퍼)
├── scripts/data-pipeline/      ← Unit 3 (합성 데이터)
├── infra/                      ← Unit 5 (Terraform)
├── prisma/                     ← Unit 5 (스키마, 마이그레이션)
├── tests/                      ← 각 유닛별 테스트
└── docs/                       ← 공유 문서
```

---

## Unit 1: Frontend

| 항목 | 내용 |
|---|---|
| **담당자 역할** | 모든 사용자 화면 (UI/UX) |
| **기술** | Next.js App Router, React, TailwindCSS |
| **브랜치** | `feat/unit1-frontend` |

### 작업 디렉토리

```
src/app/(auth)/         로그인 화면
src/app/(employee)/     임직원 화면 (새 문의, 내 문의 목록, 티켓 상세)
src/app/(agent)/        처리자 화면 (미처리 큐, 담당 티켓, 티켓 상세+답변)
src/app/(admin)/        관리자 화면 (대시보드, 통계, 사용자 관리, 설정)
src/components/         공유 UI 컴포넌트 (Button, Input, Card, Badge 등)
src/lib/api.ts          API 호출 레이어 (목업 → 실제 fetch로 교체 예정)
src/lib/mock-data.ts    목업 데이터 (API 연동 후 삭제)
```

### 핵심 규칙
- `src/app/api/` 디렉토리는 건드리지 않음 (Unit 2, 4 영역)
- API 호출은 반드시 `src/lib/api.ts`를 통해서만 (직접 fetch 금지)
- 실제 API 연동 시 `api.ts` 내부만 교체하면 페이지 코드 수정 불필요

---

## Unit 2: Intake & Routing

| 항목 | 내용 |
|---|---|
| **담당자 역할** | 티켓 생명주기, 메시지 관리, 분배 엔진, 이메일 처리 |
| **기술** | Next.js API Routes, Prisma ORM, Amazon SES SDK |
| **브랜치** | `feat/unit2-intake-routing` |

### 작업 디렉토리

```
src/app/api/tickets/    티켓 CRUD API
src/app/api/messages/   메시지 추가 API
src/app/api/webhooks/   이메일 인바운드 웹훅
src/services/ticket.service.ts    티켓 비즈니스 로직
src/services/email.service.ts     이메일 파싱/발송
src/repositories/ticket.repository.ts
src/repositories/message.repository.ts
src/lib/ses.ts          SES SDK 래퍼
```

### 소유 테이블
- `tickets`, `messages`, `ticket_assignments`, `email_threads`

### 핵심 규칙
- 메시지 추가 시 `visibility` 검증 필수 (agent_l2는 private만 허용)
- 이메일 발송 시 private 메시지 절대 발송 금지 (서버 측 차단)
- "본인 아님" 1회 처리 후 동일 담당자 재분배 금지
- AI 답변 생성은 Unit 3의 `AIService`를 호출
- 응답 형태는 `docs/api-spec.md` 준수

### 다른 유닛 호출
- Unit 3 (`AIService`): 답변 생성, 라우팅 판정, 카테고리 추천, Private→Public 변환
- Unit 4 (`UserRepository`): 사용자 정보 조회 (분배 시)

---

## Unit 3: AI/RAG

| 항목 | 내용 |
|---|---|
| **담당자 역할** | RAG 검색, LLM 호출, 답변 생성, 합성 데이터 |
| **기술** | AWS Bedrock SDK, Knowledge Base API |
| **브랜치** | `feat/unit3-ai-rag` |

### 작업 디렉토리

```
src/services/ai.service.ts           AI 핵심 로직
src/services/data-pipeline.service.ts 합성 데이터 생성
src/lib/bedrock.ts                   Bedrock SDK 래퍼
scripts/data-pipeline/               합성 데이터 배치 스크립트
```

### 소유 테이블
- `llm_usage_logs`, `knowledge_base_entries`

### 핵심 규칙
- `transformToPublic()`: **문맥(어투, 형식)만 수정, 내용(사실, 정보) 변경 절대 금지**
- 텍스트 전용 → 경량 LLM (claude-3-haiku), 파일/이미지 포함 → 고성능 LLM (claude-3-sonnet)
- 모든 LLM 호출 시 `llm.usage` 이벤트 발행 (비용 추적)
- 합성 데이터: 실 데이터 그대로 복제 금지, paraphrase/변형/신규 생성

### 제공하는 서비스 (Unit 2가 호출)
| 함수 | 용도 |
|---|---|
| `generateAnswer()` | RAG 기반 답변 생성 |
| `assessConfidence()` | 신뢰도 점수 산출 |
| `determineRouting()` | 1차 답변 / 2차 분배 / Fallback 판정 |
| `routeToModel()` | 경량/고성능 LLM 선택 |
| `suggestCategory()` | 카테고리 추천 (최대 10개) |
| `transformToPublic()` | 2차 Private → Public 가공 |

### 소비하는 이벤트 (SQS)
| 이벤트 | 큐 | 처리 |
|---|---|---|
| `message.private.created` | `helpdesk-assignment-events` | Private → Public 변환 |
| `assignment.rejected` | `helpdesk-assignment-events` | AI 재분배 판정 |
| `kb.reindex` | `helpdesk-kb-reindex` | KB 재색인 실행 |

---

## Unit 4: Admin & Analytics

| 항목 | 내용 |
|---|---|
| **담당자 역할** | 인증, 사용자/조직 관리, 통계, 피드백, KB 관리 |
| **기술** | NextAuth.js, Prisma ORM, JWT, bcrypt |
| **브랜치** | `feat/unit4-admin-analytics` |

### 작업 디렉토리

```
src/app/api/auth/       로그인/로그아웃 API
src/app/api/admin/      사용자/부서/설정 관리 API
src/app/api/analytics/  통계 API (KPI, 티켓 현황, LLM 비용)
src/app/api/feedback/   피드백 API
src/services/auth.service.ts       인증 로직
src/services/admin.service.ts      사용자/조직 관리
src/services/analytics.service.ts  통계 집계
src/services/feedback.service.ts   피드백 + 학습 데이터
src/shared/middleware/             인증 미들웨어 (Role 기반)
src/repositories/user.repository.ts
```

### 소유 테이블
- `organizations`, `departments`, `teams`, `users`, `feedbacks`

### 핵심 규칙
- 비밀번호: bcrypt 해싱 (평문 저장 금지)
- 로그인 시도 횟수 제한 (5회 초과 시 잠금)
- JWT 토큰 기반 세션 관리
- Role 기반 접근 제어: employee / agent_l1 / agent_l2 / admin
- 응답 형태는 `docs/api-spec.md` 준수

### 소비하는 이벤트 (SQS)
| 이벤트 | 큐 | 처리 |
|---|---|---|
| `llm.usage` | `helpdesk-llm-logging` | LLM 비용 로그 저장 |
| `ticket.resolved` | `helpdesk-feedback-accumulate` | 학습 데이터 누적 |

### 발행하는 이벤트 (SQS)
| 이벤트 | 큐 | 트리거 |
|---|---|---|
| `kb.reindex` | `helpdesk-kb-reindex` | 관리자 수동 트리거 또는 자동 누적 |

---

## Unit 5: Infrastructure

| 항목 | 내용 |
|---|---|
| **담당자 역할** | AWS 인프라, CI/CD, 로컬 개발 환경 |
| **기술** | Terraform, Docker, AWS |
| **브랜치** | `feat/unit5-infrastructure` |

### 작업 디렉토리

```
infra/modules/          Terraform 모듈 (ECS, RDS, SES, SQS, S3, VPC)
infra/environments/     환경별 설정 (dev, staging, prod)
prisma/                 스키마 + 마이그레이션 관리
docker-compose.yml      로컬 개발 환경
```

### 프로비저닝 대상
| 리소스 | 용도 |
|---|---|
| ECS Fargate | Next.js 앱 배포 |
| RDS PostgreSQL | 데이터베이스 |
| SQS (6개 큐) | 비동기 이벤트 통신 |
| Amazon SES | 이메일 송수신 |
| S3 | 이메일 저장, 첨부파일, KB 데이터 |
| CloudWatch | 로그, 메트릭, 알람 |
| VPC + 보안 그룹 | 네트워크 격리 |

### SQS 큐 목록
| 큐 이름 | Producer → Consumer |
|---|---|
| `helpdesk-email-inbound` | SES/Lambda → Unit 2 |
| `helpdesk-email-outbound` | Unit 2 → Unit 2 |
| `helpdesk-assignment-events` | Unit 2 → Unit 3 |
| `helpdesk-llm-logging` | Unit 3 → Unit 4 |
| `helpdesk-feedback-accumulate` | Unit 2 → Unit 4 |
| `helpdesk-kb-reindex` | Unit 4 → Unit 3 |

### 핵심 규칙
- Prisma 스키마 파일은 Unit 5가 관리하되, 각 유닛이 자기 테이블 정의를 PR로 제출
- 환경 변수는 `.env.example` 기준으로 관리
- Docker 이미지는 멀티스테이지 빌드

---

## 공유 영역 (모든 유닛 공통)

### `src/shared/` — 변경 시 전체 합의 필요

```
src/shared/types/       TypeScript 타입 정의
src/shared/constants/   상수 (enum 값, 설정값)
src/shared/utils/       유틸리티 함수
src/shared/middleware/  인증 미들웨어 (Unit 4가 구현, 전체가 사용)
```

### `src/lib/prisma.ts` — Prisma Client 싱글톤 (모든 유닛 사용)

---

## 개발 시작 방법

```bash
# 1. 레포 클론
git clone https://git-codecommit.ap-northeast-2.amazonaws.com/v1/repos/aidlc-repo

# 2. 본인 브랜치 체크아웃
git checkout feat/unit{N}-{name}

# 3. main의 최신 내용 머지 (api-spec.md 등)
git merge origin/main

# 4. 의존성 설치
cd helpdesk-ai && npm install

# 5. 로컬 DB 실행
docker compose up -d

# 6. DB 마이그레이션 적용
docker exec -i helpdesk-postgres psql -U helpdesk -d helpdesk_dev < prisma/migrations/0001_init/migration.sql

# 7. Prisma Client 생성
npx prisma generate

# 8. 개발 서버 실행
npm run dev
```

---

## 충돌 방지 규칙

1. **본인 디렉토리에서만 작업** — 다른 유닛 디렉토리 파일 수정 금지
2. **`src/shared/` 변경 시 전체 합의** — PR로 논의 후 main에 머지
3. **API 형태는 `docs/api-spec.md` 준수** — 프론트와 충돌 방지
4. **DB 스키마 변경은 본인 소유 테이블만** — 남의 테이블 마이그레이션 금지
5. **머지 순서**: shared → infra → auth → backend → frontend
