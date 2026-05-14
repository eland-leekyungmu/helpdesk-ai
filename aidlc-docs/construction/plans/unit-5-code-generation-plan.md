# Unit 5 (Infrastructure) — Code Generation Plan

## Stage Metadata
- **Stage**: CONSTRUCTION › Code Generation (per-unit)
- **Unit**: Unit 5 (Infrastructure)
- **Project Type**: Greenfield · Multi-unit Monolith
- **Code Location**: `helpdesk-ai/infra/` (Terraform) + `helpdesk-ai/` (Docker, CI/CD)
- **Documentation**: `aidlc-docs/construction/unit-5-infrastructure/code/`

## Unit Context
- **책임**: AWS 인프라 프로비저닝 (Terraform), CI/CD, Docker, Prisma 마이그레이션 관리
- **디렉토리**: `infra/`, `docker-compose.yml`, `prisma/`, `.github/` (해당 없음 → `buildspec.yml`)
- **의존성**: 없음 (Unit 5는 다른 유닛의 기반)
- **소유 파일**: `infra/**`, `docker-compose.yml`, `Dockerfile`, `buildspec*.yml`

## Input Artifacts
- `infrastructure-design/infrastructure-design.md` (17개 모듈, 서비스 구성 상세)
- `infrastructure-design/deployment-architecture.md` (배포 흐름, Terraform 실행 순서)
- `nfr-design/logical-components.md` (모듈 목록, 의존성 그래프)
- `nfr-design/nfr-design-patterns.md` (설계 패턴 10개)
- `nfr-requirements/tech-stack-decisions.md` (기술 스택 확정)

---

## Code Generation Steps

### Step 1: 프로젝트 구조 셋업
- [ ] `infra/bootstrap/` 디렉토리 생성 (main.tf, variables.tf, outputs.tf)
- [ ] `infra/modules/` 하위 16개 모듈 디렉토리 생성 (각각 main.tf, variables.tf, outputs.tf)
- [ ] `infra/environments/dev/` 디렉토리 생성 (main.tf, backend.tf, providers.tf, variables.tf, terraform.tfvars, outputs.tf)
- [ ] `infra/environments/prod/` placeholder 생성 (main.tf, terraform.tfvars.example)

### Step 2: Bootstrap 모듈
- [ ] `infra/bootstrap/main.tf` — S3 버킷 (tfstate) + DynamoDB 테이블 (lock)
- [ ] `infra/bootstrap/variables.tf` — project_name, environment
- [ ] `infra/bootstrap/outputs.tf` — bucket_name, dynamodb_table_name

### Step 3: VPC 모듈
- [ ] `infra/modules/vpc/main.tf` — VPC, Subnets (Public×2, Private×2), IGW, NAT GW×2, Route Tables, S3 Gateway Endpoint
- [ ] `infra/modules/vpc/variables.tf` — vpc_cidr, azs, public/private_cidrs, project_name, environment
- [ ] `infra/modules/vpc/outputs.tf` — vpc_id, public/private_subnet_ids, nat_gateway_ids

### Step 4: RDS 모듈
- [ ] `infra/modules/rds/main.tf` — RDS Instance, Subnet Group, Parameter Group (force_ssl), Security Group
- [ ] `infra/modules/rds/variables.tf` — instance_class, storage, vpc_id, subnet_ids, ecs_sg_id
- [ ] `infra/modules/rds/outputs.tf` — endpoint, port, security_group_id

### Step 5: SQS 모듈
- [ ] `infra/modules/sqs/main.tf` — 6 Queues + 6 DLQs + KMS 암호화
- [ ] `infra/modules/sqs/variables.tf` — queue_names, visibility_timeout, max_receive_count
- [ ] `infra/modules/sqs/outputs.tf` — queue_arns, queue_urls, dlq_arns

### Step 6: S3 모듈
- [ ] `infra/modules/s3/main.tf` — 6 Buckets (tfstate 제외 · bootstrap에서 생성) + Public Access Block + Lifecycle
- [ ] `infra/modules/s3/variables.tf` — bucket_configs
- [ ] `infra/modules/s3/outputs.tf` — bucket_arns, bucket_names

### Step 7: SES 모듈 (아웃바운드 ap-northeast-2 + 인바운드 us-east-1)
- [ ] `infra/modules/ses/main.tf` — Domain Identity, DKIM, SPF (ap-northeast-2 아웃바운드)
- [ ] `infra/modules/ses-inbound/main.tf` — Receipt Rule Set, Receipt Rule, S3 Action, Lambda Action (us-east-1)
- [ ] `infra/modules/ses-inbound/lambda/` — email forwarder Lambda 코드 (Node.js)
- [ ] `infra/modules/ses-inbound/variables.tf` + `outputs.tf`

### Step 8: OpenSearch Serverless 모듈 (us-east-1)
- [ ] `infra/modules/opensearch-serverless/main.tf` — Collection, Encryption Policy, Network Policy, Data Access Policy
- [ ] `infra/modules/opensearch-serverless/variables.tf` + `outputs.tf`

### Step 9: Bedrock KB 모듈 (us-east-1)
- [ ] `infra/modules/bedrock-kb/main.tf` — Knowledge Base, S3 Data Source, IAM Role
- [ ] `infra/modules/bedrock-kb/variables.tf` + `outputs.tf`

### Step 10: Secrets Manager 모듈
- [ ] `infra/modules/secrets/main.tf` — DB URL secret, JWT secret (random_password 생성)
- [ ] `infra/modules/secrets/variables.tf` + `outputs.tf`

### Step 11: IAM 모듈
- [ ] `infra/modules/iam/main.tf` — ECS Task Role, Execution Role, CodeBuild Role, CodePipeline Role, KB Role, Lambda Role
- [ ] `infra/modules/iam/variables.tf` + `outputs.tf`
- [ ] 각 Role에 최소 권한 Policy (Resource ARN 명시)

### Step 12: ECR 모듈
- [ ] `infra/modules/ecr/main.tf` — ECR Repository (immutable tags, scan on push, lifecycle policy)
- [ ] `infra/modules/ecr/variables.tf` + `outputs.tf`

### Step 13: ECS 모듈
- [ ] `infra/modules/ecs/main.tf` — Cluster, Service, Task Definition, Security Group
- [ ] `infra/modules/ecs/variables.tf` — cpu, memory, desired_count, container_port, image_uri
- [ ] `infra/modules/ecs/outputs.tf` — cluster_arn, service_name, security_group_id

### Step 14: ALB 모듈
- [ ] `infra/modules/alb/main.tf` — ALB, Target Group, Listeners (HTTP redirect + HTTPS), Security Group, Access Logs
- [ ] `infra/modules/alb/variables.tf` + `outputs.tf`

### Step 15: Route 53 + ACM 모듈
- [ ] `infra/modules/route53-acm/main.tf` — Hosted Zone, ACM Certificate, DNS Validation, ALB Alias Record
- [ ] `infra/modules/route53-acm/variables.tf` + `outputs.tf`

### Step 16: CloudWatch 모듈
- [ ] `infra/modules/cloudwatch/main.tf` — Log Groups, 15 Alarms, SNS Topic, Metric Filters
- [ ] `infra/modules/cloudwatch/variables.tf` + `outputs.tf`

### Step 17: Monitoring 모듈
- [ ] `infra/modules/monitoring/main.tf` — CloudTrail, VPC Flow Logs, AWS Config, Budgets
- [ ] `infra/modules/monitoring/variables.tf` + `outputs.tf`

### Step 18: CodeCommit CI/CD 모듈
- [ ] `infra/modules/codecommit-cicd/main.tf` — CodePipeline×2, CodeBuild×4, Artifact Bucket
- [ ] `infra/modules/codecommit-cicd/variables.tf` + `outputs.tf`
- [ ] `buildspec-infra-plan.yml` — Terraform plan buildspec
- [ ] `buildspec-infra-apply.yml` — Terraform apply buildspec
- [ ] `buildspec-app-build.yml` — npm ci + test + audit + docker build + ecr push
- [ ] `buildspec-app-deploy.yml` — ECS deploy (또는 Pipeline ECS action 사용)

### Step 19: Dev 환경 루트 구성
- [ ] `infra/environments/dev/main.tf` — 모든 모듈 호출 (단일 state)
- [ ] `infra/environments/dev/backend.tf` — S3 backend 설정
- [ ] `infra/environments/dev/providers.tf` — aws (ap-northeast-2) + aws.us_east_1
- [ ] `infra/environments/dev/variables.tf` — 전체 변수 정의
- [ ] `infra/environments/dev/terraform.tfvars` — dev 환경 값
- [ ] `infra/environments/dev/outputs.tf` — 주요 output

### Step 20: Dockerfile + docker-compose 업데이트
- [ ] `helpdesk-ai/Dockerfile` — Multi-stage build (node:22-alpine)
- [ ] `helpdesk-ai/docker-compose.yml` 업데이트 — 기존 PostgreSQL 유지 + README 안내
- [ ] `helpdesk-ai/.dockerignore` — node_modules, .terraform, .git 등

### Step 21: Prisma 마이그레이션 확인
- [ ] 기존 `prisma/schema.prisma` 확인 (이미 완성됨)
- [ ] 기존 `prisma/migrations/0001_init/` 확인
- [ ] 필요 시 마이그레이션 스크립트 추가 (vector extension 등은 Unit 3 시점)

### Step 22: 문서 생성
- [ ] `aidlc-docs/construction/unit-5-infrastructure/code/code-summary.md` — 생성된 파일 목록 + 실행 가이드
- [ ] `helpdesk-ai/infra/README.md` — Terraform 실행 가이드 (bootstrap → dev apply)

### Step 23: .gitignore 업데이트
- [ ] `helpdesk-ai/.gitignore` 업데이트 — Terraform 관련 항목 추가

---

## Story Traceability

Unit 5는 특정 User Story를 직접 구현하지 않지만, **모든 유닛의 인프라 기반**을 제공합니다.

| 인프라 컴포넌트 | 지원하는 유닛/스토리 |
|---|---|
| VPC + ECS + ALB | 전체 (모든 유닛의 실행 환경) |
| RDS | Unit 2, 3, 4 (데이터 저장) |
| SQS | Unit 2, 3, 4 (비동기 이벤트) |
| SES | Unit 2 (이메일 인바운드/아웃바운드) |
| OpenSearch + Bedrock KB | Unit 3 (AI/RAG) |
| Secrets Manager | Unit 4 (인증) |
| CI/CD | 전체 (배포 자동화) |

---

## 실행 예상 규모

- **총 파일 수**: ~70~80개 (.tf, .yml, Lambda 코드, Dockerfile 등)
- **총 Step 수**: 23개
- **예상 코드량**: ~3000~4000 줄 (Terraform HCL + buildspec YAML + Lambda JS + Dockerfile)

---

## 주의사항

1. **Access Key 필요 시점**: Step 2(Bootstrap) 실행 시 `aws configure` 완료 필요 — 코드 생성 후 실제 apply 시점에 안내
2. **Route 53 NS 레코드**: 도메인 등록기관에서 수동 설정 필요 — 코드 생성 후 안내
3. **Bedrock 모델 접근 요청**: us-east-1 콘솔에서 수동 — 코드 생성 후 안내
4. **SES Sandbox**: 초기 sandbox 상태 — 외부 발송 테스트 시 해제 요청 필요
