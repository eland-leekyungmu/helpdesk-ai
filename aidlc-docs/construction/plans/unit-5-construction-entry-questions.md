# Unit 5 (Infrastructure) — CONSTRUCTION Entry Questions

## 목적
CONSTRUCTION 단계 진입 전, Unit 5 (Infrastructure) 진행 방식과 범위를 확정하기 위한 질문입니다.

`aidlc-state.md` 기준 현재 상태:
- INCEPTION 완료 (Workspace Detection, Requirements, User Stories, Workflow Planning, Application Design, Units Generation)
- CONSTRUCTION 미진입
- `execution-plan.md` 원안: **Option C** (Functional + NFR + Infrastructure 설계를 5유닛 통합으로 먼저 수행 → Code Generation은 유닛별 순차)
- 사용자 요청: "Unit 5 인프라 부분을 진행"

각 질문의 `[Answer]:` 태그 뒤에 선택한 알파벳 하나를 기입해주세요. 해당 옵션이 없으면 마지막(Other) 선택 후 설명을 기재하면 됩니다. 완료되면 "done" 또는 "완료"라고 알려주세요.

---

## Question 1
Unit 5의 진행 범위를 어떻게 할까요? (현재 `execution-plan.md`의 Option C와 실제 요청 사이 조율 필요)

A) 원안 준수 — 5개 유닛 전체 설계(Functional + NFR + Infrastructure)를 통합으로 먼저 완료한 뒤 Unit 5 Code Generation 진행
B) Unit 5 단독 Fast-track — 다른 유닛은 뒤로 미루고, Unit 5만 NFR Requirements → NFR Design → Infrastructure Design → Code Generation을 순차 진행 (Functional Design은 Unit 5에 해당 없음 처리)
C) 최단 경로 — Unit 5의 Infrastructure Design + Code Generation만 진행, NFR은 Requirements 문서와 SECURITY rules에서 직접 매핑 (간소화)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
B, 유닛을 5개로 나눈 이유는 5개의 파트를 5명이 나누어 각각 진행하기 위함이야 추후 머지 시 최소한의 충돌(최대한 충돌없게)로 머지가 가능하도록 고려해줘
---

## Question 2
배포 환경 범위는 어떻게 할까요?

A) dev 환경만 완전 구축, staging/prod는 placeholder (MVP 최소)
B) dev + prod 두 환경 완비 (staging 생략)
C) dev/staging/prod 3환경 모두 Terraform 구성 (execution-plan 원안)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

## Question 3
Terraform 상태 관리(backend)와 CI/CD 범위를 어떻게 할까요?

A) S3 + DynamoDB lock backend + GitHub Actions plan/apply 워크플로우까지 완비
B) S3 + DynamoDB lock backend만 구성, CI/CD는 배포 스크립트/README 절차만 제공
C) 로컬 실행 전제 — backend 미구성, CI/CD 제외 (MVP 최소)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A이지만 구성에 대한 설명을 부탁해, 그리고 현재 소스는 codecommit 리포지토리를 생성한 상태야
---

## Question 4
AWS 계정/리전 및 네트워킹 전제는 어떻게 할까요?

A) 단일 AWS 계정 · 단일 리전(ap-northeast-2 서울) · 신규 VPC
B) 단일 AWS 계정 · 단일 리전(us-east-1 버지니아 — Bedrock 모델 가용성 최적) · 신규 VPC
C) 기존 AWS 계정/VPC 재사용 — 세부는 별도 공유
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

## Question 5
Bedrock Knowledge Base의 벡터 스토어는 어떻게 프로비저닝할까요? (Unit 3 소유지만 인프라는 Unit 5가 제공)

A) OpenSearch Serverless (AWS 권장, Bedrock KB 기본 연동)
B) Aurora PostgreSQL + pgvector (기존 RDS와 통합, 비용 절감)
C) Pinecone 등 외부 벡터 DB (외부 서비스 연동)
D) 결정 보류 — Unit 3 설계 시점에 확정
E) Other (please describe after [Answer]: tag below)
A, 오픈서치를 직접 사용하는게 아니라 KB연동이 맞지?
[Answer]: 

---

## Question 6
로컬 개발 환경(docker-compose) 확장 범위를 어떻게 할까요? (현재 PostgreSQL만 포함)

A) PostgreSQL만 유지 — 나머지(SES/SQS/Bedrock)는 AWS dev 환경 사용
B) PostgreSQL + LocalStack (SES/SQS/S3 에뮬레이션) — 오프라인 개발 가능
C) PostgreSQL + LocalStack + pgvector — 모든 로컬 에뮬레이션
D) Other (please describe after [Answer]: tag below)

[Answer]: 
D, 로컬 개발환경을 도커로 설정한 이유가 뭔지 일단 설명을 듣고 싶어
---

## Question 7
기존 `helpdesk-ai/` 골격과 Unit 5 책임 경계를 어떻게 정리할까요?

A) 기존 골격 유지 — `prisma/schema.prisma`, `docker-compose.yml`, `infra/`를 그대로 확장
B) 기존 골격 리팩터링 — Unit 5 책임(`infra/`, `prisma/`, `docker-compose.yml`, CI/CD)에 맞춰 재배치 후 확장
C) Other (please describe after [Answer]: tag below)

[Answer]: 
A로 할게, 나중에 머지할때 잘 고려해줘
---

## 응답 후 다음 단계
답변을 확인한 뒤 Q1 선택에 따라 다음 중 하나로 진행합니다:
- **A 선택** → Functional Design 통합 계획 수립 (5유닛 대상)
- **B 선택** → NFR Requirements 계획 수립 (Unit 5 대상) → `aidlc-docs/construction/plans/unit-5-nfr-requirements-plan.md`
- **C 선택** → Infrastructure Design 계획 수립 (Unit 5 대상) → `aidlc-docs/construction/plans/unit-5-infrastructure-design-plan.md`
