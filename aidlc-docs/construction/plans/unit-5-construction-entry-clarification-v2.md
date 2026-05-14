# Unit 5 (Infrastructure) — CONSTRUCTION Entry Clarification (Round 2)

## 목적
이전 Clarification Round 1에서 **Clarification Question 3 (로컬 개발 환경)** 답변이 "C" + 재확인 질문 형태였습니다. 이 질문을 **두 개의 분리된 결정**으로 재구조화하여 정확한 의도를 확정합니다.

## Round 1 답변 요약 (확정)
- **Clarification 1.1 Terraform Backend**: **A** — S3 + DynamoDB lock + Bootstrap 모듈
- **Clarification 1.2 CI/CD**: **A** — AWS CodePipeline + CodeBuild
- **Clarification 2 Bedrock KB 벡터 스토어**: **A** — OpenSearch Serverless + Bedrock KB
- **Clarification 3 로컬 개발 환경**: **C** + 재확인 질문 → ↓ 아래에서 재질의

## 사용자 관찰 (요약)
> "이미 로컬호스트에 PostgreSQL을 설치해서 이용 중. 타 유닛은 Docker 쓸 수도 있지만 나중에 머지할 때 합치면 됨. 지금은 이미 설치된 로컬 DB 이용이 좋지 않을까?"

---

## 설명: 결정이 두 개로 분리되는 이유

`unit-of-work.md`에 따르면 **Unit 5의 책임 범위**에 **로컬 개발 환경(`docker-compose.yml`)** 이 포함되어 있습니다. 이는 Unit 5 담당자 본인이 아니라 **팀 전체(5명)를 위한 산출물**입니다.

따라서 결정이 두 축으로 나뉩니다:

| 결정 축 | 내용 | 머지 영향 |
|---|---|---|
| **Decision A**: Unit 5 담당자 본인의 로컬 개발 방식 | 이미 설치된 로컬 PostgreSQL 사용 (확정된 선호) | 없음 — 개인 환경 선택 |
| **Decision B**: 팀 산출물로 `docker-compose.yml` 유지 여부 | 다른 유닛 개발자(Unit 1~4 담당자 4명)가 사용할 수 있도록 제공할지 | `helpdesk-ai/docker-compose.yml` 파일 존재/삭제 |

**중요**: Decision A는 이미 "로컬 PostgreSQL 사용"으로 결정된 상태로 보고, **Decision B만 Clarification Question 으로 남깁니다**.

---

## 옵션별 트레이드오프

| 옵션 | Unit 5 담당자 | 타 유닛 개발자 | 머지 리스크 | 운영 부담 |
|---|---|---|---|---|
| **A. `docker-compose.yml` 유지** | 로컬 PG 사용 (사용자 본인 선호대로) | 원하는 사람만 `docker compose up` | 없음 (Unit 5 전용 파일) | 거의 없음 — PostgreSQL 단일 서비스 |
| **B. `docker-compose.yml` 제거** | 로컬 PG 사용 | 각자 로컬 PG 설치 필수, README 가이드 제공 | 낮음 | 각 개발자 PG 설치 가이드 문서 필요 |
| **C. `docker-compose.yml`을 "옵션 예제"로 남김** | 로컬 PG 사용 | README에 "선택사항"으로 안내 | 없음 | A와 동일하되 문서만 추가 |

**AI 관점**: 
- `docker-compose.yml`은 이미 존재하고 PostgreSQL 한 서비스만 정의됨 (20줄 수준). 유지 비용 거의 0.
- 5명 팀에서 일부는 Docker 선호, 일부는 로컬 설치 선호할 가능성 높음. **선택권을 주는 것이 팀 마찰 최소화**.
- 머지 관점에서도 Unit 5 디렉토리 격리 원칙상 `docker-compose.yml` 존재 여부가 타 유닛 작업에 영향 없음.

---

## Clarification Question (Round 2)

### Question: 팀 산출물로 `docker-compose.yml`을 어떻게 처리할까요?

A) 유지 — PostgreSQL 서비스만 정의된 현재 파일 그대로, README에 "로컬 PG 설치" / "Docker" 양쪽 사용법 병기. Unit 5 담당자 본인은 로컬 PG 사용
B) 제거 — `docker-compose.yml` 삭제, 각자 로컬 PostgreSQL 설치 필수. README에 설치 가이드(macOS/Windows/Linux)만 제공
C) 유지하되 "선택사항"으로 명시 — 파일 유지 + README에 "기본은 로컬 PG, Docker는 선택" 기재
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A, 나는 로컬PG사용할게 산출물 등은 유지하자
---

## 참고: 머지 관점 정리

`unit-of-work.md` 기준 Unit 5의 파일 권한:
- `infra/` — Unit 5 전용
- `docker-compose.yml` — Unit 5 전용 (프로젝트 루트)
- `prisma/` 디렉토리의 스키마 파일 — Unit 5 관리 (각 유닛의 테이블 정의 수집)

→ **`docker-compose.yml` 자체는 다른 유닛 코드와 경로 충돌 없음**. 머지 시점에 새로 추가하거나 제거하는 것도 안전합니다. 그러므로 현재 결정을 "일단 방향만 확정"으로 보고, 필요 시 Infrastructure Design 단계에서 재조정 가능합니다.

---

## 응답 후 다음 단계

답변 확정 후 즉시 다음 단계로 진행합니다:

1. **Extension 적용 범위 검증** — `extensions/security/` 등 로드된 extension 확인 및 Unit 5 적용 범위 결정
2. `unit-5-nfr-requirements-plan.md` 생성 — NFR Requirements 계획 + 질문지
