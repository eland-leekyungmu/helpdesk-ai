# Unit 5 (Infrastructure) — NFR Design Plan

## Stage Metadata
- **Stage**: CONSTRUCTION › NFR Design (per-unit)
- **Unit**: Unit 5 (Infrastructure)
- **Track**: Fast-track (Functional Design skip)
- **Input**: `aidlc-docs/construction/unit-5-infrastructure/nfr-requirements/nfr-requirements.md` + `tech-stack-decisions.md`

## Output Artifacts (Step 6에서 생성 예정)
- `aidlc-docs/construction/unit-5-infrastructure/nfr-design/nfr-design-patterns.md`
- `aidlc-docs/construction/unit-5-infrastructure/nfr-design/logical-components.md`

---

## Execution Plan (Checkbox)

- [x] Step 1: NFR Requirements 분석 완료
- [x] Step 2: NFR Design Plan 생성 (이 파일)
- [x] Step 3: Context-appropriate 질문 생성 (아래)
- [x] Step 4: Plan 저장 완료
- [ ] Step 5: 답변 수집 + 모호성 검증
- [ ] Step 6: `nfr-design-patterns.md` + `logical-components.md` 생성
- [ ] Step 7: Completion 메시지 제시
- [ ] Step 8: 사용자 승인 대기
- [ ] Step 9: 승인 기록 + aidlc-state.md 업데이트

---

## NFR Design 범위 분석

Unit 5는 **인프라 유닛**이므로 "설계 패턴"은 애플리케이션 코드 패턴이 아니라 **인프라 아키텍처 패턴**입니다. NFR Requirements에서 이미 대부분의 서비스/사이징이 확정되었으므로, 이 단계에서는 다음에 집중합니다:

1. **Terraform 모듈 간 의존성 및 실행 순서** — 어떤 모듈이 먼저 apply되어야 하는가
2. **VPC Endpoint 세부 선정** — 비용 vs 보안 트레이드오프
3. **OpenSearch Serverless 비용 관리 패턴** — 개발 중 기동/정지 운영 절차
4. **ECS Task Role 분리 전략** — 풀스택 Next.js 단일 컨테이너에서 유닛별 권한 분리 방법
5. **Secrets rotation Lambda 구성** — 자동 rotation 아키텍처

---

## 질문지

각 질문의 `[Answer]:` 태그 뒤에 알파벳 하나를 기입해주세요. 완료되면 "완료" 또는 "done"으로 알려주세요.

---

### Question 1 — VPC Interface Endpoints 범위

NFR Requirements에서 "S3 (Gateway) + SQS/Secrets/Logs/ECR (Interface) — NFR Design에서 최종 선정"으로 남겨두었습니다.

**비용 참고**: Interface Endpoint 1개 = ~$7.5/월/AZ × 2 AZ = ~$15/월. 4개 구성 시 ~$60/월 추가.

A) **전체 구성** — S3(Gateway) + SQS + Secrets Manager + CloudWatch Logs + ECR API + ECR DKR (6개) — NAT 트래픽 최소화 · 보안 강화
B) **최소 구성** — S3(Gateway) + ECR API + ECR DKR만 (3개) — ECS 이미지 pull 시 NAT 비용 절감 · 나머지는 NAT 경유
C) **S3 Gateway만** — 나머지 전부 NAT 경유 (비용 최소 · 보안은 SG로 충분)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
C
---

### Question 2 — OpenSearch Serverless 비용 관리

dev 환경에서 OpenSearch Serverless 최소 OCU(2+2)가 월 $350+입니다. 개발 중 상시 가동이 아닌 경우 비용 절감 방법:

A) **상시 가동** — 개발 기간 내내 유지 · 비용 감수 (단순)
B) **수동 관리** — 필요 시 `terraform apply` (Collection 생성) / `terraform destroy -target` (삭제) · README에 절차 문서화
C) **Terraform 변수 스위치** — `enable_opensearch = true/false` 변수로 조건부 생성 · 불필요 시 false로 apply하면 삭제
D) **초기에는 미생성** — Unit 3(AI/RAG) 개발 시점에 처음 생성 · 그 전까지 비용 0
E) Other (please describe after [Answer]: tag below)

[Answer]: 
A로 하면 될 것 같아, 아마 오늘 오후 또는 내일부터 작업할거 같아 KB쪽 말이야.
---

### Question 3 — ECS Task Role 분리 전략

현재 아키텍처는 **Next.js 풀스택 모노레포 단일 컨테이너**입니다. 하나의 ECS Task에서 모든 유닛의 코드가 실행되므로, 유닛별 IAM 권한 분리가 물리적으로 어렵습니다.

A) **단일 Task Role** — 모든 유닛이 필요로 하는 권한을 하나의 Role에 합산 · SECURITY-06 최소 권한은 "서비스 단위"로 해석 (전체 앱이 하나의 서비스)
B) **기능별 Policy 분리** — 단일 Role이지만 Policy를 기능별로 분리 (sqs-policy, bedrock-policy, ses-policy, rds-policy 등) · 추후 마이크로서비스 전환 시 분리 용이
C) **Lambda 분리** — SQS consumer 워커를 Lambda로 분리하여 각 Lambda에 최소 권한 Role 부여 · ECS는 웹 요청만 처리
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

### Question 4 — Secrets Manager Rotation Lambda

DB password 자동 rotation(90일)을 위해 Lambda function이 필요합니다.

A) **AWS 제공 rotation template 사용** — `SecretsManagerRDSPostgreSQLRotationSingleUser` Lambda · Terraform으로 프로비저닝
B) **커스텀 rotation Lambda** — 직접 작성 · 추가 로직(알림, 로깅) 포함
C) **Rotation 미구성** — 수동 rotation · MVP에서는 90일 rotation 불필요 (dev 환경 한정)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
C, DB 패스워드는 로테이션 하지 않을게
---

### Question 5 — Terraform 모듈 apply 순서 및 의존성

`infra/environments/dev/main.tf`에서 모듈을 호출할 때, 일부 모듈은 다른 모듈의 output을 참조합니다. 이를 어떻게 관리할까요?

A) **단일 state** — `dev/main.tf` 하나에 모든 모듈 호출 · Terraform이 의존성 자동 해결 · `terraform apply` 1회로 전체 프로비저닝
B) **분할 state** — `dev/01-network/`, `dev/02-data/`, `dev/03-compute/` 등 레이어별 분리 · 각각 독립 apply · output은 `terraform_remote_state` data source로 참조
C) **Terragrunt** — 모듈 간 의존성을 `dependency` 블록으로 선언 · 순서 자동 해결
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

### Question 6 — CodeBuild 환경 및 빌드 캐시

CodeBuild 프로젝트 설정:

A) **표준 이미지** — `aws/codebuild/amazonlinux2-x86_64-standard:5.0` · 캐시 없음 (빌드 시간 3~5분 예상)
B) **표준 이미지 + S3 캐시** — node_modules 캐시로 빌드 시간 단축 (~1~2분)
C) **커스텀 이미지** — ECR에 빌드 전용 이미지 (Terraform + Node.js + Docker 포함) · 캐시 포함
D) Other (please describe after [Answer]: tag below)

[Answer]: 
B
---

## 응답 후 다음 단계
1. 답변 확정 → `nfr-design-patterns.md` + `logical-components.md` 생성
2. Completion 메시지 + 승인 대기
3. 다음 단계: **Infrastructure Design**
