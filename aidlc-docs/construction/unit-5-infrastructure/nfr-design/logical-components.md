# Unit 5 (Infrastructure) — Logical Components

## 개요
NFR Design Patterns를 실현하기 위한 **논리적 인프라 컴포넌트** 목록입니다. 각 컴포넌트는 Terraform 모듈 1개에 대응됩니다.

---

## Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Account (ap-northeast-2)              │
│                                                                 │
│  ┌───────────────────── VPC (10.0.0.0/16) ───────────────────┐  │
│  │                                                           │  │
│  │  ┌─── Public Subnet (AZ-a) ───┐  ┌─── Public Subnet (AZ-c) ───┐  │
│  │  │  ALB                       │  │  ALB                       │  │
│  │  │  NAT Gateway               │  │  NAT Gateway               │  │
│  │  └────────────────────────────┘  └────────────────────────────┘  │
│  │                                                           │  │
│  │  ┌─── Private Subnet (AZ-a) ──┐  ┌─── Private Subnet (AZ-c) ──┐  │
│  │  │  ECS Tasks                 │  │  ECS Tasks                 │  │
│  │  │  RDS (Primary/Standby)     │  │                            │  │
│  │  └────────────────────────────┘  └────────────────────────────┘  │
│  │                                                           │  │
│  │  S3 Gateway Endpoint                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─── Regional Services ─────────────────────────────────────┐  │
│  │  SQS × 6 + DLQ × 6                                       │  │
│  │  Secrets Manager (DB URL, JWT Secret)                     │  │
│  │  SES (도메인 인증, 인바운드 Rule Set)                      │  │
│  │  OpenSearch Serverless (벡터 Collection)                   │  │
│  │  S3 (KB 데이터, ALB 로그, tfstate)                        │  │
│  │  CloudWatch (Logs, Alarms, Dashboards)                    │  │
│  │  CloudTrail + AWS Config                                  │  │
│  │  ECR (helpdesk-ai 리포지토리)                              │  │
│  │  CodePipeline × 2 + CodeBuild × 4                        │  │
│  │  SNS (알람 알림)                                           │  │
│  │  Route 53 (호스팅 영역)                                    │  │
│  │  ACM (TLS 인증서)                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─── Cross-Region (us-east-1) ──────────────────────────────┐  │
│  │  Bedrock (InvokeModel, KB Retrieve) — 앱에서 직접 호출     │  │
│  │  Bedrock Knowledge Base + S3 Data Source                  │  │
│  │  OpenSearch Serverless Collection (벡터)                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**참고**: Bedrock KB + OpenSearch Serverless는 **us-east-1**에 프로비저닝됩니다 (G2=A). Terraform에서 별도 `provider "aws" { alias = "us_east_1" }` 사용.

---

## Terraform 모듈 목록

| # | 모듈 | 경로 | 주요 리소스 | 의존 대상 |
|---|---|---|---|---|
| 1 | **vpc** | `infra/modules/vpc/` | VPC, Subnets, IGW, NAT GW, Route Tables, S3 GW Endpoint | 없음 |
| 2 | **rds** | `infra/modules/rds/` | RDS Instance, Subnet Group, Parameter Group, Security Group | vpc |
| 3 | **sqs** | `infra/modules/sqs/` | SQS Queue × 6, DLQ × 6, KMS alias | 없음 |
| 4 | **ses** | `infra/modules/ses/` | SES Domain Identity, DKIM, Receipt Rule Set, S3 (이메일 저장) | vpc (Lambda VPC 접근 시) |
| 5 | **opensearch-serverless** | `infra/modules/opensearch-serverless/` | Collection, Access Policy, Network Policy, Encryption Policy | 없음 (us-east-1 provider) |
| 6 | **bedrock-kb** | `infra/modules/bedrock-kb/` | Knowledge Base, Data Source (S3), IAM Role | opensearch-serverless, s3 |
| 7 | **s3** | `infra/modules/s3/` | S3 Buckets (KB data, ALB logs, email storage) | 없음 |
| 8 | **ecs** | `infra/modules/ecs/` | ECS Cluster, Service, Task Definition, Task Role, Execution Role, Security Group | vpc, rds, sqs, secrets, s3 |
| 9 | **alb** | `infra/modules/alb/` | ALB, Target Group, Listener (HTTP→HTTPS redirect, HTTPS), Security Group | vpc, ecs, acm |
| 10 | **cloudwatch** | `infra/modules/cloudwatch/` | Log Groups, Metric Filters, Alarms, Dashboard, SNS Topic | ecs, rds, sqs, alb |
| 11 | **codecommit-cicd** | `infra/modules/codecommit-cicd/` | CodePipeline × 2, CodeBuild × 4, IAM Roles, S3 Artifact Bucket | ecr, ecs |
| 12 | **iam** | `infra/modules/iam/` | ECS Task Role, Execution Role, CodeBuild Role, CodePipeline Role | sqs, s3, secrets, rds |
| 13 | **secrets** | `infra/modules/secrets/` | Secrets Manager Secrets (DB URL, JWT) | rds |
| 14 | **route53-acm** | `infra/modules/route53-acm/` | Route 53 Hosted Zone, ACM Certificate, DNS Validation | 없음 |
| 15 | **monitoring** | `infra/modules/monitoring/` | CloudTrail, VPC Flow Logs, AWS Config, Budgets | vpc, s3 |
| 16 | **ecr** | `infra/modules/ecr/` | ECR Repository (immutable tags, scan on push) | 없음 |

---

## 모듈 의존성 그래프

```
                    route53-acm    ecr
                        │           │
vpc ─────┬──────────────┼───────────┼──────────────────────
         │              │           │
    ┌────┴────┐    ┌────┴────┐     │
    │   rds   │    │   alb   │     │
    └────┬────┘    └────┬────┘     │
         │              │           │
    ┌────┴────┐         │      ┌───┴────────┐
    │ secrets │         │      │ codecommit  │
    └────┬────┘         │      │   -cicd     │
         │              │      └───┬────────┘
         └──────┬───────┘          │
                │                  │
           ┌────┴────┐             │
           │   ecs   │─────────────┘
           └────┬────┘
                │
         ┌──────┴──────┐
         │ cloudwatch  │
         └─────────────┘

(독립) sqs, ses, s3, monitoring
(us-east-1) opensearch-serverless → bedrock-kb
```

---

## 환경 구성 파일 구조

```
infra/
├── bootstrap/
│   ├── main.tf              # S3 bucket + DynamoDB table
│   ├── variables.tf
│   └── outputs.tf
│
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── rds/
│   ├── sqs/
│   ├── ses/
│   ├── opensearch-serverless/
│   ├── bedrock-kb/
│   ├── s3/
│   ├── ecs/
│   ├── alb/
│   ├── cloudwatch/
│   ├── codecommit-cicd/
│   ├── iam/
│   ├── secrets/
│   ├── route53-acm/
│   ├── monitoring/
│   └── ecr/
│
└── environments/
    ├── dev/
    │   ├── main.tf          # 모든 모듈 호출 (단일 state)
    │   ├── backend.tf       # S3 backend 설정
    │   ├── providers.tf     # aws (ap-northeast-2) + aws.us_east_1
    │   ├── variables.tf
    │   ├── terraform.tfvars # dev 환경 값
    │   └── outputs.tf
    └── prod/
        ├── main.tf
        ├── backend.tf
        ├── providers.tf
        ├── variables.tf
        ├── terraform.tfvars.example
        └── outputs.tf
```

---

## Cross-Region 구성 (us-east-1)

Bedrock KB + OpenSearch Serverless는 us-east-1에 배치됩니다.

```hcl
# infra/environments/dev/providers.tf
provider "aws" {
  region = "ap-northeast-2"
  # default_tags 포함
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  # default_tags 포함
}
```

모듈 호출 시:
```hcl
module "opensearch_serverless" {
  source = "../../modules/opensearch-serverless"
  providers = {
    aws = aws.us_east_1
  }
  # ...
}

module "bedrock_kb" {
  source = "../../modules/bedrock-kb"
  providers = {
    aws = aws.us_east_1
  }
  # ...
}
```

---

## S3 버킷 목록

| 버킷 이름 패턴 | 용도 | 리전 | 암호화 |
|---|---|---|---|
| `helpdesk-ai-tfstate-{env}` | Terraform state | ap-northeast-2 | aws/s3 |
| `helpdesk-ai-kb-data-{env}` | KB 엔트리 (JSON/TXT) | us-east-1 | aws/s3 |
| `helpdesk-ai-alb-logs-{env}` | ALB 액세스 로그 | ap-northeast-2 | aws/s3 |
| `helpdesk-ai-email-{env}` | SES 인바운드 이메일 저장 | ap-northeast-2 | aws/s3 |
| `helpdesk-ai-codepipeline-{env}` | CodePipeline 아티팩트 | ap-northeast-2 | aws/s3 |
| `helpdesk-ai-codebuild-cache-{env}` | CodeBuild S3 캐시 | ap-northeast-2 | aws/s3 |

---

## SQS 큐 목록 (상세)

| 큐 이름 | DLQ 이름 | Visibility | MaxReceive | 암호화 |
|---|---|---|---|---|
| `helpdesk-email-inbound-{env}` | `helpdesk-email-inbound-dlq-{env}` | 30s | 3 | aws/sqs |
| `helpdesk-email-outbound-{env}` | `helpdesk-email-outbound-dlq-{env}` | 30s | 3 | aws/sqs |
| `helpdesk-llm-logging-{env}` | `helpdesk-llm-logging-dlq-{env}` | 30s | 3 | aws/sqs |
| `helpdesk-feedback-accumulate-{env}` | `helpdesk-feedback-accumulate-dlq-{env}` | 30s | 3 | aws/sqs |
| `helpdesk-kb-reindex-{env}` | `helpdesk-kb-reindex-dlq-{env}` | 30s | 3 | aws/sqs |
| `helpdesk-assignment-events-{env}` | `helpdesk-assignment-events-dlq-{env}` | 30s | 3 | aws/sqs |

---

## CloudWatch Alarms 목록

| 알람 이름 | 메트릭 | 조건 | 액션 |
|---|---|---|---|
| `ecs-health-{env}` | ECS RunningTaskCount | < desiredCount (5분) | SNS |
| `rds-cpu-{env}` | RDS CPUUtilization | > 80% (10분) | SNS |
| `rds-storage-{env}` | RDS FreeStorageSpace | < 20% | SNS |
| `alb-5xx-{env}` | ALB HTTPCode_ELB_5XX_Count | > 10 (5분) | SNS |
| `sqs-dlq-*-{env}` (×6) | ApproximateNumberOfMessagesVisible | > 0 | SNS |
| `bedrock-throttle-{env}` | Logs metric filter | ThrottlingException > 0 | SNS |
| `ses-bounce-{env}` | SES Bounce | > 5% | SNS |
| `opensearch-capacity-{env}` | SearchIndexCapacity | > 90% | SNS |
| `auth-failure-{env}` | Logs metric filter | "login failed" > 5 (5분) | SNS |

---

## IAM Roles 목록

| Role 이름 | 용도 | 주요 권한 |
|---|---|---|
| `helpdesk-ai-ecs-task-role-{env}` | ECS Task 실행 시 앱이 사용 | SQS, SES, Bedrock, S3, Secrets, OpenSearch, Logs |
| `helpdesk-ai-ecs-execution-role-{env}` | ECS Agent가 사용 (이미지 pull, 로그 생성) | ECR GetAuthorizationToken, ecr:BatchGetImage, logs:CreateLogStream |
| `helpdesk-ai-codebuild-role-{env}` | CodeBuild 프로젝트 실행 | S3 (cache, artifacts), ECR push, Logs, Terraform state S3/DynamoDB |
| `helpdesk-ai-codepipeline-role-{env}` | CodePipeline 오케스트레이션 | CodeCommit, CodeBuild, S3, ECS, SNS |
| `helpdesk-ai-bedrock-kb-role-{env}` | Bedrock KB가 S3/OpenSearch 접근 | S3 GetObject, aoss:APIAccessAll |

---

## 로컬 개발 환경 연동

Unit 5 담당자(로컬 PG 사용)가 Terraform을 실행하기 위한 전제:

1. **AWS CLI 설치** + `aws configure` (Access Key / Secret Key 설정)
2. **Terraform >= 1.9 설치**
3. **Bootstrap 1회 실행**: `cd infra/bootstrap && terraform init && terraform apply`
4. **Dev 환경 프로비저닝**: `cd infra/environments/dev && terraform init && terraform apply`
5. **도메인 준비**: Route 53 호스팅 영역 생성 후 NS 레코드를 도메인 등록기관에 설정

---

## 미결 사항 (Infrastructure Design에서 확정)

- Route 53 도메인명 (사용자 제공 필요)
- ECS Task CPU/Memory 정확한 사이징
- SES sandbox 탈출 시점
- Bedrock 모델 접근 권한 활성화 (콘솔에서 수동 요청 필요)
- AWS Budgets 정확한 임계값
