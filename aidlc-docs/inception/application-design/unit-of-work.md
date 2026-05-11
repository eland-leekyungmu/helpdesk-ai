# Units of Work

## 개요
- **프로젝트 유형**: Greenfield (Next.js 풀스택 모노레포)
- **배포 모델**: 단일 Next.js 앱 (ECS Fargate), 내부 모듈 분리
- **유닛 수**: 5개
- **개발자 수**: 5명 (1인 1유닛)

---

## Unit 1: Frontend

| 항목 | 내용 |
|---|---|
| **담당 영역** | 모든 사용자 인터페이스 (페이지, 컴포넌트, 클라이언트 로직) |
| **기술** | Next.js App Router, React, TailwindCSS |
| **디렉토리** | `src/app/`, `src/components/` |

### 책임 범위
- 임직원 문의 입력 화면 (`src/app/(employee)/`)
- 임직원 히스토리 조회 화면
- 1차/2차 처리자 화면 (`src/app/(agent)/`)
- 관리자 대시보드/통계/설정 화면 (`src/app/(admin)/`)
- 로그인 화면 (`src/app/(auth)/`)
- 공유 UI 컴포넌트 (`src/components/`)
- 클라이언트 상태 관리
- API Routes 호출 (fetch/axios)

### 의존성
- `src/shared/types/` (공유 타입 참조)
- API Routes (Unit 2, 3, 4가 구현)

---

## Unit 2: Intake & Routing

| 항목 | 내용 |
|---|---|
| **담당 영역** | 티켓 CRUD, 메시지 관리, 분배 엔진, 이메일 파싱/발송 |
| **기술** | Next.js API Routes, Prisma ORM, Amazon SES SDK |
| **디렉토리** | `src/services/ticket.*`, `src/services/email.*`, `src/app/api/tickets/`, `src/app/api/messages/`, `src/app/api/webhooks/`, `src/lib/ses.ts` |

### 책임 범위
- 티켓 생성/조회/상태 변경 API
- 메시지 추가 API (visibility 검증, Public/Private)
- 분배 엔진 (AI 자동 + 수동)
- "본인 아님" 처리 및 재분배 로직
- 이메일 인바운드 파싱 (SES → Lambda → API)
- 이메일 스레드 기반 티켓 식별
- 이메일 아웃바운드 발송 (Public만, Private 차단)
- 최종 답변 후 재문의 → 이전 2차 처리자 재분배

### 소유 테이블
- tickets, messages, ticket_assignments, email_threads

### 의존성
- AIService (Unit 3) — 답변 생성, 분배 판정 호출
- `src/shared/types/` (공유 타입)

---

## Unit 3: AI/RAG

| 항목 | 내용 |
|---|---|
| **담당 영역** | RAG 검색, LLM 호출, 답변 생성, 모델 라우팅, 합성 데이터 |
| **기술** | AWS Bedrock SDK, Knowledge Base API, Node.js 배치 스크립트 |
| **디렉토리** | `src/services/ai.*`, `src/services/data-pipeline.*`, `src/lib/bedrock.ts`, `scripts/data-pipeline/` |

### 책임 범위
- RAG 검색 (유사 문의-답변 매칭)
- LLM 모델 라우팅 (텍스트→경량, 멀티모달→고성능)
- 답변 생성 + 신뢰도 점수 산출
- 라우팅 판정 (1차 답변 / 2차 분배 / Fallback)
- 2차 Private → Public 가공 (문맥만 수정, 내용 변경 금지)
- 카테고리 추천 (멀티, 최대 10개)
- LLM 호출 로깅 (비용 추적)
- 합성 데이터 생성 배치 스크립트 (일회성)
- 합성 데이터 품질 검증 및 KB 적재

### 소유 테이블
- llm_usage_logs, knowledge_base_entries

### 의존성
- AWS Bedrock / Knowledge Base (외부 서비스)
- `src/shared/types/` (공유 타입)

---

## Unit 4: Admin & Analytics

| 항목 | 내용 |
|---|---|
| **담당 영역** | 인증, 사용자/조직 관리, 통계, 피드백, KB 관리 |
| **기술** | NextAuth.js, Prisma ORM, JWT, bcrypt |
| **디렉토리** | `src/services/auth.*`, `src/services/admin.*`, `src/services/analytics.*`, `src/services/feedback.*`, `src/app/api/auth/`, `src/app/api/admin/`, `src/app/api/analytics/`, `src/app/api/feedback/` |

### 책임 범위
- 로그인/로그아웃, JWT 토큰 관리
- Role 기반 미들웨어 (employee/agent_l1/agent_l2/admin)
- 로그인 시도 횟수 제한, 비밀번호 해싱
- 사용자 CRUD
- 조직 구조 관리 (법인/부서/팀 CRUD)
- 담당자-팀 매핑
- KPI 통계 (1차 해결률, 분배 성공률, 처리 시간)
- LLM 비용 통계 (모델별/기간별)
- 피드백 수집 (👍/👎)
- 학습 데이터 누적 (티켓 완료 → KB 엔트리)
- KB 재색인 트리거

### 소유 테이블
- organizations, departments, teams, users, feedbacks

### 의존성
- `src/shared/types/` (공유 타입)

---

## Unit 5: Infrastructure

| 항목 | 내용 |
|---|---|
| **담당 영역** | AWS 인프라 프로비저닝, CI/CD, 로컬 개발 환경 |
| **기술** | Terraform, Docker, AWS (ECS, RDS, SES, Bedrock, S3, SQS, CloudWatch) |
| **디렉토리** | `infra/`, `docker-compose.yml`, `prisma/` (스키마/마이그레이션) |

### 책임 범위
- Terraform 모듈 작성 (ECS, RDS, SES, S3, SQS, CloudWatch, VPC)
- 환경별 구성 (dev/staging/prod)
- Prisma 스키마 및 마이그레이션 관리
- Docker 이미지 빌드 설정
- CI/CD 파이프라인 구성
- 로컬 개발 환경 (docker-compose)
- SQS 큐 프로비저닝 (6개 큐)
- CloudWatch 로그/메트릭/알람 설정
- SES 도메인 인증 및 수신 규칙

### 소유 테이블
- 없음 (Prisma 스키마 파일은 관리하지만 테이블 설계 권한은 각 유닛)

### 의존성
- 모든 유닛의 인프라 요구사항 수집

---

## 코드 조직 전략

### 충돌 방지 원칙
1. **디렉토리 격리**: 각 유닛은 지정된 디렉토리에서만 작업
2. **공유 계약 선확정**: `src/shared/`는 Application Design에서 확정, 변경 시 전체 합의
3. **단방향 의존**: 유닛 간 의존은 공유 인터페이스를 통해서만
4. **Prisma 스키마**: Unit 5가 파일 관리, 각 유닛이 자기 테이블 정의를 PR로 제출

### 머지 순서
1. `src/shared/` (공유 타입) — 최초 1회
2. `infra/` + `prisma/` (Unit 5) — 인프라 기반
3. `src/services/auth.*` + `src/app/api/auth/` (Unit 4) — 인증 기반
4. `src/services/ticket.*` + `src/services/email.*` (Unit 2) — 핵심 비즈니스
5. `src/services/ai.*` (Unit 3) — AI 연동
6. `src/app/` 페이지 (Unit 1) — 프론트엔드
