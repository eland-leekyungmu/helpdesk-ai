# Helpdesk AI - 애플리케이션

IT Help Desk AI 자동 응답 및 티켓 분배 시스템의 애플리케이션 소스 코드입니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) + React 19 |
| 스타일링 | Tailwind CSS 4 |
| 데이터베이스 | PostgreSQL 15 (AWS RDS) |
| ORM | Prisma 7 |
| AI/RAG | AWS Bedrock (Claude Sonnet 4) + Knowledge Base |
| 파일 저장 | AWS S3 |
| 인증 | JWT + bcrypt |
| 테스트 | Vitest |
| 차트 | Recharts |

---

## 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일에 DB, AWS 자격 증명 등 입력
```

### 3. Prisma 설정
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

## 디렉토리 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/            # 관리자 페이지
│   ├── (agent)/            # 처리자 페이지 (1차/2차)
│   ├── (auth)/             # 로그인 페이지
│   ├── (employee)/         # 임직원 페이지
│   └── api/                # REST API 엔드포인트
├── components/             # UI 컴포넌트
│   ├── layout/             # 레이아웃 (헤더, 사이드바)
│   ├── forms/              # 폼 컴포넌트
│   └── ui/                 # 공통 UI (버튼, 카드, 모달 등)
├── lib/                    # 외부 서비스 연동
│   ├── bedrock.ts          # AWS Bedrock (LLM + KB)
│   ├── s3.ts               # AWS S3 (파일 업로드/다운로드)
│   ├── prisma.ts           # Prisma 클라이언트
│   └── api.ts              # 프론트엔드 API 호출 유틸
├── repositories/           # 데이터 접근 계층 (DB CRUD)
├── services/               # 비즈니스 로직 계층
│   ├── ai.service.ts       # AI 답변 생성, 의도 분석, 라우팅
│   ├── ticket.service.ts   # 티켓 생성, 분배, 상태 관리
│   ├── message.service.ts  # 메시지 추가, Private→Public 변환
│   ├── auth.service.ts     # 로그인, JWT 발급, 계정 잠금
│   ├── admin.service.ts    # 사용자/조직 CRUD
│   ├── analytics.service.ts# 통계/KPI 산출
│   ├── feedback.service.ts # 피드백 + KB 학습 데이터 적재
│   └── config.service.ts   # 시스템 설정 관리
└── shared/                 # 공통 모듈
    ├── types/              # TypeScript 타입 정의
    ├── constants/          # 상수 (카테고리, 조직 구조)
    ├── middleware/         # 인증/인가 미들웨어
    └── utils/              # 유틸리티 함수

tests/
├── unit/                   # 단위 테스트
├── integration/            # 통합 테스트 (AWS 연동)
└── e2e/                    # E2E 테스트 (미구축)

prisma/
└── schema.prisma           # 데이터베이스 스키마

infra/
├── modules/                # Terraform 모듈 (VPC, RDS, ECS 등)
├── environments/           # 환경별 설정 (dev, prod)
└── bootstrap/              # 초기 설정
```

---

## 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 프로덕션 서버 실행 |
| `npm test` | 단위 테스트 실행 |
| `npm run lint` | ESLint 검사 |

---

## AI-DLC 개발 방법론

본 프로젝트는 **AI-DLC(AI-Driven Development Life Cycle)** 방법론으로 개발되었습니다.

- **설계 산출물**: `aidlc-docs/` 디렉토리 참조
- **진행 상태**: `aidlc-docs/aidlc-state.md`
- **의사결정 로그**: `aidlc-docs/audit.md`
- **사용 도구**: Kiro IDE + Claude (코드 생성, 설계, 테스트)
- **런타임 AI**: AWS Bedrock (Claude Sonnet 4) + Knowledge Base (RAG)

### 개발 단계
1. INCEPTION: 요구사항 → 유저스토리 → 설계 → 유닛 분할
2. CONSTRUCTION: 기능설계 → NFR → 인프라 → 코드 생성 → 빌드/테스트
3. POST Build-and-Test: 버그 수정 및 기능 개선 (미니 사이클)
