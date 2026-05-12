# Unit 5 (Infrastructure) — CONSTRUCTION Entry Clarification Questions

## 목적
이전 질문지(`unit-5-construction-entry-questions.md`) 답변 중 설명 요청 및 추가 정보(CodeCommit 사용)로 인해 재확인이 필요한 3가지 항목에 대해 설명을 제공하고 최종 답변을 받습니다.

## 원 답변 요약 (참조용)
- Q1: **B** — Unit 5 단독 Fast-track (5명 병렬 개발 · 머지 충돌 최소화 원칙 추가)
- Q2: **A** — dev 환경만 완전 구축
- Q3: **A** + 설명 요청 + **CodeCommit 리포지토리 생성 상태**
- Q4: **A** — 단일 계정 · ap-northeast-2 · 신규 VPC
- Q5: **A** + 확인 질문 (+ 답변 포맷 이슈)
- Q6: **D** + 설명 요청
- Q7: **A** — 기존 골격 유지 (머지 시 고려)

---

## 설명 및 재질의

---

### 🔎 Clarification 1 — Q3 재확인 (Terraform Backend + CI/CD)

#### 설명

**① Terraform Backend: S3 + DynamoDB lock 구성**

Terraform은 리소스 상태를 `terraform.tfstate` 파일에 저장하는데, 기본은 로컬 파일입니다. 팀 협업에서는 이 파일을 **공유 가능한 원격 저장소에 두고**, 동시에 여러 명이 apply하는 것을 막기 위한 **lock 메커니즘**이 필요합니다. AWS 표준 패턴은 다음과 같습니다.

| 리소스 | 역할 |
|---|---|
| **S3 버킷** (예: `helpdesk-ai-tfstate-dev`) | `.tfstate` 파일 저장 · 버전 관리 활성화 · 서버측 암호화(AES256 또는 KMS) · Public Access Block |
| **DynamoDB 테이블** (예: `helpdesk-ai-tfstate-lock`) | `LockID`(String) 해시 키 · `terraform apply` 시 lock 획득, 종료 시 해제 |

`backend.tf` 예시:
```hcl
terraform {
  backend "s3" {
    bucket         = "helpdesk-ai-tfstate-dev"
    key            = "dev/terraform.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "helpdesk-ai-tfstate-lock"
    encrypt        = true
  }
}
```

**Bootstrap 문제**: Backend용 S3/DynamoDB 자체도 인프라이므로, **bootstrap 모듈**(`infra/bootstrap/`)을 별도로 두어 최초 1회 로컬 backend로 생성한 후, 이후 모든 환경이 이 backend를 사용하는 2단계 구조로 처리합니다.

---

**② CI/CD: CodeCommit 환경에서의 선택지**

귀하가 **CodeCommit에 소스를 두고 있다**고 하셨는데, 이 경우 GitHub Actions는 사용할 수 없고(트리거 주체가 GitHub이 아니므로) AWS 네이티브 또는 타 CI 플랫폼을 선택해야 합니다.

| 옵션 | 구성 | 장점 | 단점 |
|---|---|---|---|
| **A. AWS CodePipeline + CodeBuild** | CodeCommit push → CodePipeline 트리거 → CodeBuild에서 `terraform plan/apply`, 앱 빌드/ECR 푸시, ECS 배포 | AWS 네이티브 · IAM 통합 · 추가 계정 불필요 | AWS CLI/HCL 친화적이나 UI 가독성 낮음 |
| **B. CodeBuild만 사용 (수동 트리거)** | CodeCommit + CodeBuild 프로젝트 2개(plan / apply) · 수동 Start Build | 구조 단순 · 빠른 구축 · 권한 최소화 | 자동화 수준 낮음 |
| **C. GitHub 미러링 후 GitHub Actions** | CodeCommit을 GitHub로 미러 푸시 → GitHub Actions 사용 | 생태계 풍부, 원래 계획 유지 | 미러링 복잡성, 두 SCM 유지 |
| **D. Jenkins 등 별도 CI 서버** | EC2에 Jenkins 구축 · CodeCommit webhook | 유연성 높음 | 운영 부담 |

**MVP 추천**: **A (CodePipeline + CodeBuild)** — 5명 병렬 개발 시 auto-merge에 PR 없는 CodeCommit 특성상, 브랜치 전략(`dev` 브랜치 push → dev 환경 자동 배포)이 자연스럽고, AWS IAM role 기반 실행으로 자격증명 관리도 단순합니다.

---

#### Clarification Question 1.1
Terraform Backend + Bootstrap 전략은 어떻게 할까요?

A) 표준 구성 — S3(버전 관리 + 암호화) + DynamoDB lock + Bootstrap 모듈(`infra/bootstrap/`)로 최초 1회 로컬 backend로 생성
B) 단순 구성 — S3만 사용, DynamoDB lock 생략 (혼자 apply할 때만 적합)
C) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

#### Clarification Question 1.2
CodeCommit 환경에서 CI/CD는 어떻게 할까요?

A) AWS CodePipeline + CodeBuild — Terraform plan/apply 파이프라인 + 앱 빌드(ECR 푸시) + ECS 배포
B) AWS CodeBuild만 사용 — plan/apply를 수동 트리거 프로젝트로 구성, ECS 배포도 수동
C) GitHub로 미러링 후 GitHub Actions 사용
D) 일단 CI/CD는 최소한(CodeBuild 2~3개)만 구성, 파이프라인은 향후 확장
E) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

### 🔎 Clarification 2 — Q5 재확인 (Bedrock KB 벡터 스토어 + 답변 포맷)

#### 설명

**① OpenSearch 직접 사용이 아니라 Bedrock KB 연동 맞습니다.**

Bedrock Knowledge Base의 아키텍처:

```
[앱] ─(API 호출)→ [Bedrock Knowledge Base]
                        │
                        ├── [데이터 소스: S3 버킷] ← KB 엔트리 JSON/TXT 업로드
                        │
                        └── [벡터 스토어: OpenSearch Serverless Collection]
                                              ↑
                                  KB가 자동으로 임베딩 생성 + 색인 관리
```

- **앱 코드는 OpenSearch SDK를 직접 호출하지 않습니다.** `bedrock-agent-runtime:Retrieve` 또는 `RetrieveAndGenerate` API만 호출하면, KB가 내부적으로 OpenSearch를 쿼리하여 결과를 반환합니다.
- **Unit 5의 역할**: 
  - OpenSearch Serverless Collection(벡터 전용) 프로비저닝
  - S3 데이터 소스 버킷 생성
  - Bedrock KB 리소스 생성 + S3 데이터 소스 연결 + OpenSearch Collection 연결
  - 임베딩 모델 지정 (예: `amazon.titan-embed-text-v2:0`)
  - 필요한 IAM role 및 데이터 접근 정책 구성
- **Unit 3의 역할**: `bedrock-agent-runtime` SDK 호출, KB 엔트리 S3 업로드, ingestion job 트리거, 검색 결과 후처리

**② 답변 포맷 이슈**
원 질문지 Q5에서 답변 텍스트가 `[Answer]:` 태그 **위**에 기입되어 있었고 태그 뒤는 빈 상태입니다. 재확인을 위해 아래 항목에 다시 기입해주세요.

#### Clarification Question 2
위 설명을 전제로 벡터 스토어는 OpenSearch Serverless(Bedrock KB가 내부에서 사용)로 확정할까요?

A) 확정 — OpenSearch Serverless Collection + Bedrock KB + S3 데이터 소스 구성 (앱은 KB API만 호출)
B) 변경 — pgvector로 전환 (RDS와 통합, 하지만 Bedrock KB 내장 연동 불가 → 앱에서 직접 벡터 검색 구현 필요)
C) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

### 🔎 Clarification 3 — Q6 재확인 (로컬 개발 환경 Docker)

#### 설명

**Docker(docker-compose)를 로컬 개발 환경에 사용하는 주된 이유**

1. **환경 일관성** — 5명의 개발자가 macOS/Windows/Linux를 혼용해도 동일한 PostgreSQL 버전(16-alpine)과 동일한 초기 설정을 재현. "내 컴퓨터에선 되는데" 문제 제거.
2. **격리** — 로컬 머신에 PostgreSQL을 직접 설치할 필요가 없고, 프로젝트 간 DB 충돌 없음. `docker compose down -v`로 깨끗한 초기화 가능.
3. **재현 가능한 마이그레이션 테스트** — `prisma migrate dev`를 빈 DB에 반복 적용하며 스키마 변경을 검증.
4. **CI 환경과의 동등성** — CodeBuild 컨테이너에서도 동일한 이미지로 통합 테스트 실행 가능.
5. **네트워크 비용/레이턴시 절감** — dev AWS RDS에 원격 접속하지 않고 로컬 쿼리로 빠른 개발.
6. **확장 가능** — PostgreSQL 외에도 **LocalStack(SES/SQS/S3 에뮬레이션)**, **MinIO(S3 대체)** 등을 추가하면 AWS 서비스도 오프라인 에뮬레이션 가능. 단, **Bedrock은 LocalStack에서 미지원** (AWS dev 환경 필요).

**Trade-off**

| 옵션 | 장점 | 단점 |
|---|---|---|
| **A. PostgreSQL만** | 가볍고 단순 · 빠른 시작 | SES/SQS 테스트 시 AWS dev 사용 (비용 · 인터넷 필요) |
| **B. PostgreSQL + LocalStack (Free)** | SES/SQS/S3 오프라인 · 단위/통합 테스트 빨라짐 | Bedrock은 여전히 AWS 필요 · LocalStack Free tier 기능 제한 |
| **C. B + pgvector** | 벡터 검색도 로컬 시뮬레이션 | Bedrock KB와 호환 안 됨 — Q5 A 선택 시 무의미 |
| **D. 미사용** | 가장 단순 | 환경 차이로 인한 문제 가능성 증가 |

**Q5=A 전제** 시 C는 의미 없음. 현실적으로 **A 또는 B가 실용적 선택**입니다.

#### Clarification Question 3
설명을 전제로 로컬 개발 환경 범위를 어떻게 할까요?

A) PostgreSQL만 유지 — 가볍게, SES/SQS/Bedrock은 AWS dev 환경 사용
B) PostgreSQL + LocalStack — SES/SQS/S3 오프라인 에뮬레이션 추가 (Bedrock은 AWS dev)
C) Docker 사용 중단 — Prisma 마이그레이션용 스크립트만 제공, 각자 로컬 PostgreSQL 설치
D) Other (please describe after [Answer]: tag below)

[Answer]: 
C, 난 이미 로컬호스트에 PostgreSQL을 설치해서 이용 중인데 그래도 docker로 이용하는게 좋을까?
타 유닛은 도커를 쓸 수도 있긴해 근데 이건 나중에 머지할때 다시 합치면 되니깐...
지금은 그냥 이미 설치된 로컬db를 이용하는게 좋지 않을까?
---

## 응답 후 다음 단계

확정 후 **Q1=B(Unit 5 단독 Fast-track)** 에 따라 다음 순서로 진행합니다:

1. `unit-5-nfr-requirements-plan.md` — NFR Requirements 계획 수립 + 질문지
2. `unit-5-nfr-design-plan.md` — NFR Design 계획 수립 + 질문지
3. `unit-5-infrastructure-design-plan.md` — Infrastructure Design 계획 수립 + 질문지
4. `unit-5-code-generation-plan.md` — Code Generation 계획 수립

각 단계마다 AI-DLC 규칙에 따라 질문은 파일에, 승인 대기는 명시적으로 처리합니다. 머지 충돌 최소화 원칙은 `unit-of-work.md`의 디렉토리 격리(`infra/`, `prisma/`, `docker-compose.yml`만 Unit 5 권한) 전제를 준수하며 Infrastructure Design 단계에서 다시 반영합니다.
