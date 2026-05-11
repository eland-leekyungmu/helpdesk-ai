# Components Design

## 시스템 아키텍처 개요

```
+--------------------------------------------------+
|                   Client Layer                    |
|  [Browser - Next.js SSR/CSR]  [Email - SES]      |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|              Next.js Application                  |
|              (ECS Fargate)                        |
|                                                  |
|  +------------+  +------------+  +------------+  |
|  | Frontend   |  | API Routes |  | Server     |  |
|  | Pages/     |  | /api/*     |  | Actions    |  |
|  | Components |  |            |  |            |  |
|  +------------+  +------------+  +------------+  |
|                        |                         |
|  +--------------------------------------------+  |
|  |           Service Layer (Internal)         |  |
|  |                                            |  |
|  | +----------+ +----------+ +-------------+ |  |
|  | | Ticket   | | AI/RAG   | | Admin       | |  |
|  | | Service  | | Service  | | Service     | |  |
|  | +----------+ +----------+ +-------------+ |  |
|  | +----------+ +----------+ +-------------+ |  |
|  | | Email    | | Auth     | | Analytics   | |  |
|  | | Service  | | Service  | | Service     | |  |
|  | +----------+ +----------+ +-------------+ |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
          |              |              |
          v              v              v
+----------+    +------------+    +----------+
| PostgreSQL|    | AWS Bedrock|    | Amazon   |
| (RDS)     |    | + KB       |    | SES      |
+----------+    +------------+    +----------+
```

---

## 컴포넌트 목록

### 1. Frontend Module
| 항목 | 내용 |
|---|---|
| **책임** | 사용자 인터페이스 렌더링, 클라이언트 상태 관리 |
| **기술** | Next.js Pages/App Router, React, TailwindCSS |
| **소유 유닛** | Unit 1 (Frontend) |

**하위 컴포넌트:**
- `pages/employee/` — 임직원 문의 입력, 히스토리 조회
- `pages/agent/` — 1차/2차 처리자 화면
- `pages/admin/` — 관리자 대시보드, 통계, 설정
- `pages/auth/` — 로그인, 인증 관련
- `components/` — 공유 UI 컴포넌트

### 2. Ticket Service
| 항목 | 내용 |
|---|---|
| **책임** | 티켓 CRUD, 상태 관리, 메시지 관리 (Public/Private), 분배 로직 |
| **기술** | Next.js API Routes, Prisma ORM |
| **소유 유닛** | Unit 2 (Intake & Routing) |

**핵심 기능:**
- 티켓 생성/조회/상태 변경
- 메시지 추가 (visibility 필드 관리)
- 분배 엔진 (AI 자동 + 수동)
- "본인 아님" 처리 및 재분배 로직
- 이메일 스레드 기반 티켓 식별

### 3. AI/RAG Service
| 항목 | 내용 |
|---|---|
| **책임** | RAG 검색, LLM 호출, 답변 생성, 신뢰도 판정, LLM 라우팅 |
| **기술** | AWS Bedrock SDK, Knowledge Base API |
| **소유 유닛** | Unit 3 (AI/RAG) |

**핵심 기능:**
- RAG 검색 (유사 문의-답변 매칭)
- LLM 모델 라우팅 (텍스트→경량, 멀티모달→고성능)
- 답변 생성 + 신뢰도 점수 산출
- 2차 처리자 Private 답변 → Public 가공 (문맥만 수정, 내용 변경 금지)
- 카테고리 추천
- LLM 호출 로깅 (비용 추적용)

### 4. Email Service
| 항목 | 내용 |
|---|---|
| **책임** | 인바운드 이메일 파싱, 아웃바운드 이메일 발송, 티켓 식별 |
| **기술** | Amazon SES, Lambda (인바운드 트리거) |
| **소유 유닛** | Unit 2 (Intake & Routing) |

**핵심 기능:**
- 인바운드 이메일 수신 및 파싱 (SES → S3 → Lambda → API)
- 이메일 헤더 기반 티켓 식별 (Message-ID, In-Reply-To, References)
- 아웃바운드 이메일 발송 (Public 메시지만, Private 차단)
- 티켓 ID를 이메일 제목/헤더에 포함

### 5. Auth Service
| 항목 | 내용 |
|---|---|
| **책임** | 사용자 인증, 세션 관리, 역할 기반 접근 제어 |
| **기술** | NextAuth.js (Credentials Provider), JWT, bcrypt |
| **소유 유닛** | Unit 4 (Admin & Analytics) |

**핵심 기능:**
- 로그인/로그아웃
- JWT 토큰 발급 및 검증
- Role 기반 미들웨어 (employee/agent-l1/agent-l2/admin)
- 로그인 시도 횟수 제한
- 비밀번호 해싱 (bcrypt)

### 6. Admin & Analytics Service
| 항목 | 내용 |
|---|---|
| **책임** | 담당자/부서 관리, 통계 집계, LLM 비용 통계, KB 관리 |
| **기술** | Next.js API Routes, Prisma ORM |
| **소유 유닛** | Unit 4 (Admin & Analytics) |

**핵심 기능:**
- 담당자/부서 CRUD
- KPI 통계 (1차 해결률, 분배 성공률, 처리 시간)
- LLM 비용 통계 (모델별, 기간별)
- 피드백 데이터 관리
- KB 재색인 트리거

### 7. Data Pipeline (합성 데이터)
| 항목 | 내용 |
|---|---|
| **책임** | 실 데이터 기반 합성 데이터 생성, 품질 검증, KB 적재 |
| **기술** | Node.js 배치 스크립트, AWS Bedrock LLM |
| **소유 유닛** | Unit 3 (AI/RAG) |

**핵심 기능:**
- 실 데이터 로드 및 분석
- LLM 기반 합성 질문-답변 생성 (paraphrase, 변형, 신규)
- 품질 검증 (중복 제거, 형식 검증, 카테고리 태깅)
- KB 적재 및 색인

### 8. Infrastructure
| 항목 | 내용 |
|---|---|
| **책임** | AWS 인프라 프로비저닝, CI/CD, 모니터링 |
| **기술** | Terraform, AWS (ECS, RDS, SES, Bedrock, S3, CloudWatch) |
| **소유 유닛** | Unit 5 (Infrastructure) |

---

## 유닛-컴포넌트 매핑

| Unit | 소유 컴포넌트 |
|---|---|
| Unit 1: Frontend | Frontend Module |
| Unit 2: Intake & Routing | Ticket Service, Email Service |
| Unit 3: AI/RAG | AI/RAG Service, Data Pipeline |
| Unit 4: Admin & Analytics | Auth Service, Admin & Analytics Service |
| Unit 5: Infrastructure | Infrastructure (Terraform) |
