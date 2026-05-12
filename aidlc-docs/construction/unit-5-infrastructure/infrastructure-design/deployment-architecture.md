# Unit 5 (Infrastructure) — Deployment Architecture

## 개요
dev 환경의 전체 배포 아키텍처를 시각화한 문서입니다.

---

## 1. 전체 배포 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AWS Account                                        │
│                                                                             │
│  ┌─────────────────── ap-northeast-2 (서울) ──────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌─── Route 53 ───┐    ┌─── ACM ───┐                                 │  │
│  │  │ ai-dlc.        │    │ *.ai-dlc.  │                                 │  │
│  │  │ innoplecloud.  │    │ innoplecloud│                                │  │
│  │  │ net            │    │ .net       │                                 │  │
│  │  └───────┬────────┘    └─────┬──────┘                                 │  │
│  │          │                   │                                         │  │
│  │  ┌───── VPC (10.0.0.0/16) ──┴────────────────────────────────────┐    │  │
│  │  │                                                                │    │  │
│  │  │  ┌── Public Subnet (AZ-a) ──┐  ┌── Public Subnet (AZ-c) ──┐  │    │  │
│  │  │  │  NAT GW                  │  │  NAT GW                  │  │    │  │
│  │  │  │  ALB (internet-facing)   │  │  ALB                     │  │    │  │
│  │  │  └──────────────────────────┘  └──────────────────────────┘  │    │  │
│  │  │              │ (port 3000)                                     │    │  │
│  │  │  ┌── Private Subnet (AZ-a) ─┐  ┌── Private Subnet (AZ-c) ─┐  │    │  │
│  │  │  │                          │  │                          │  │    │  │
│  │  │  │  ECS Fargate Task        │  │  (standby for scaling)   │  │    │  │
│  │  │  │  [helpdesk-ai:abc1234]   │  │                          │  │    │  │
│  │  │  │  1 vCPU / 2 GB           │  │                          │  │    │  │
│  │  │  │                          │  │                          │  │    │  │
│  │  │  │  RDS PostgreSQL 16       │  │                          │  │    │  │
│  │  │  │  db.t4g.small / 20GB     │  │                          │  │    │  │
│  │  │  └──────────────────────────┘  └──────────────────────────┘  │    │  │
│  │  │                                                                │    │  │
│  │  │  S3 Gateway Endpoint                                           │    │  │
│  │  └────────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  │  ┌─── Regional Services ─────────────────────────────────────────┐    │  │
│  │  │  SQS × 6 + DLQ × 6                                           │    │  │
│  │  │  SES (아웃바운드 발송)                                          │    │  │
│  │  │  Secrets Manager (DB URL, JWT)                                │    │  │
│  │  │  CloudWatch (Logs, Alarms, Dashboard)                         │    │  │
│  │  │  CloudTrail + AWS Config + VPC Flow Logs                      │    │  │
│  │  │  ECR (helpdesk-ai repository)                                 │    │  │
│  │  │  CodePipeline × 2 + CodeBuild × 4                            │    │  │
│  │  │  SNS (alerts topic)                                           │    │  │
│  │  └───────────────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────── us-east-1 (버지니아) ───────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌─── SES 인바운드 ──────────────────────────────────────────────┐    │  │
│  │  │  Domain: help.ai-dlc.innoplecloud.net                        │    │  │
│  │  │  Receipt Rule → S3 저장 → Lambda → SQS (ap-northeast-2)     │    │  │
│  │  └──────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  │  ┌─── Bedrock + KB ─────────────────────────────────────────────┐    │  │
│  │  │  Knowledge Base (helpdesk-ai-kb-dev)                         │    │  │
│  │  │  Data Source: S3 (helpdesk-ai-kb-data-dev)                   │    │  │
│  │  │  Vector Store: OpenSearch Serverless (2+2 OCU)               │    │  │
│  │  │  Models: Claude 3.5 Sonnet, Haiku, Titan Embed v2           │    │  │
│  │  └──────────────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── IaC State ────────────────────────────────────────────────────────┐  │
│  │  S3: helpdesk-ai-tfstate-dev (ap-northeast-2)                        │  │
│  │  DynamoDB: helpdesk-ai-tfstate-lock (ap-northeast-2)                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 이메일 인바운드 흐름 (크로스 리전)

```
[사용자 이메일] → support@help.ai-dlc.innoplecloud.net
        ↓ (MX 레코드)
[SES us-east-1] 수신
        ↓ (Receipt Rule)
    ┌───┴───┐
    │       │
    v       v
[S3]    [Lambda: helpdesk-ai-email-forwarder-dev]
(원본)       ↓ (크로스 리전 호출)
        [SQS ap-northeast-2: helpdesk-ai-email-inbound-dev]
                ↓
        [ECS Worker] 이메일 파싱 → 티켓 생성/업데이트
```

---

## 3. AI/RAG 호출 흐름 (크로스 리전)

```
[ECS Task ap-northeast-2]
        ↓ (HTTPS, NAT Gateway 경유)
[Bedrock us-east-1]
    ├── InvokeModel (Claude Sonnet/Haiku) → 답변 생성
    └── bedrock-agent-runtime:Retrieve → KB 검색
                ↓
        [OpenSearch Serverless us-east-1] 벡터 검색 (KB 내부)
                ↓
        검색 결과 반환 → ECS에서 후처리
```

---

## 4. CI/CD 배포 흐름

### Infra Pipeline
```
[개발자] → CodePipeline 콘솔 "Release change" 클릭
        ↓
[Source] CodeCommit (feat/unit5* 브랜치 최신 커밋)
        ↓
[Plan] CodeBuild: terraform init → fmt → validate → plan
        ↓ (plan 결과 아티팩트 저장)
[Approval] SNS 알림 → 승인자 확인 → 승인
        ↓
[Apply] CodeBuild: terraform apply -auto-approve
        ↓
완료
```

### App Pipeline
```
[개발자] → CodePipeline 콘솔 "Release change" 클릭
        ↓
[Source] CodeCommit (main 브랜치 최신 커밋)
        ↓
[Build+Test] CodeBuild: npm ci → npm test → npm audit
        ↓
[Docker+ECR] CodeBuild: docker build → tag (git-sha) → ecr push
        ↓
[Approval] SNS 알림 → 승인자 확인 → 승인
        ↓
[Deploy] ECS Service update (new task definition → rolling update)
        ↓
완료
```

---

## 5. Terraform 실행 순서

단일 state (`infra/environments/dev/main.tf`) · 1회 `terraform apply`로 전체 프로비저닝.

Terraform이 자동 해결하는 의존성 순서:
```
1. vpc (VPC, Subnets, IGW, NAT, Route Tables, S3 Endpoint)
2. route53-acm (Hosted Zone, ACM Certificate)
3. rds (RDS Instance, Subnet Group, Parameter Group, SG)
4. sqs (6 Queues + 6 DLQs)
5. s3 (6 Buckets)
6. ses (Domain Identity, DKIM, Receipt Rule - ap-northeast-2 아웃바운드)
7. ses-inbound (us-east-1: Receipt Rule, S3, Lambda) ← aws.us_east_1 provider
8. opensearch-serverless (us-east-1: Collection, Policies) ← aws.us_east_1 provider
9. bedrock-kb (us-east-1: KB, Data Source) ← aws.us_east_1 provider
10. secrets (Secrets Manager: DB URL, JWT)
11. iam (Task Role, Execution Role, CodeBuild Role, Pipeline Role, KB Role, Lambda Role)
12. ecr (Repository)
13. ecs (Cluster, Service, Task Definition)
14. alb (ALB, Target Group, Listeners)
15. cloudwatch (Log Groups, Alarms, Dashboard, SNS)
16. monitoring (CloudTrail, VPC Flow Logs, Config)
17. codecommit-cicd (CodePipeline × 2, CodeBuild × 4)
```

---

## 6. 프로비저닝 전제 조건 (수동 작업)

Code Generation 후 `terraform apply` 전에 필요한 수동 작업:

| # | 작업 | 시점 |
|---|---|---|
| 1 | AWS CLI 설치 + `aws configure` (Access Key / Secret Key) | Terraform 실행 전 |
| 2 | Terraform >= 1.9 설치 | Terraform 실행 전 |
| 3 | `infra/bootstrap/` 로컬 apply (tfstate S3 + DynamoDB) | 최초 1회 |
| 4 | Route 53 호스팅 영역의 NS 레코드를 도메인 등록기관에 설정 | DNS 동작 전 |
| 5 | Bedrock 모델 접근 요청 (us-east-1 콘솔에서 수동) | Bedrock 호출 전 |
| 6 | SES sandbox 탈출 요청 (prod 전환 시) | 외부 이메일 발송 전 |

---

## 7. dev 환경 월 비용 예상 (최종)

| 항목 | 월 예상 |
|---|---|
| OpenSearch Serverless (2+2 OCU) | ~$350 |
| NAT Gateway × 2 | ~$70 |
| RDS db.t4g.small + 20GB | ~$35 |
| ECS Fargate 1 task (1vCPU/2GB) | ~$36 |
| ALB | ~$20 |
| S3 (6 buckets) | ~$5 |
| SQS (12 queues) | ~$1 |
| Secrets Manager (2 secrets) | ~$1 |
| CloudWatch + CloudTrail + Config | ~$15 |
| SES (sandbox, 최소) | ~$0 |
| Lambda (email forwarder) | ~$0 |
| CodePipeline + CodeBuild | ~$5 |
| Route 53 + ACM | ~$1 |
| **합계** | **~$540/월** |

⚠️ OpenSearch Serverless가 65%를 차지. 8일 운영 시 약 $145.

---

## 8. SECURITY Compliance (Infrastructure Design)

| Rule | 상태 | 근거 |
|---|---|---|
| SECURITY-01 | ✅ | 모든 저장소 KMS 암호화 · TLS 1.2+ 강제 |
| SECURITY-02 | ✅ | ALB 액세스 로그 · CloudTrail · VPC Flow |
| SECURITY-06 | ✅ | IAM Role 6개 · Resource ARN 명시 |
| SECURITY-07 | ✅ | Private 서브넷 · SG 체인 · NAT 경유 |
| SECURITY-09 | ✅ | S3 PAB · random password · 최소 이미지 |
| SECURITY-10 | ✅ | ECR scan · immutable tags · S3 캐시 |
| SECURITY-11 | ⚠️ | WAF 없음 (MVP) — 앱 rate limit으로 완화 |
| SECURITY-12 | ✅ | Secrets Manager · rotation 미구성(dev 수용) |
| SECURITY-13 | ✅ | ECR immutable · Pipeline IAM 분리 |
| SECURITY-14 | ✅ | 15개 알람 · 30일 보존 · CloudTrail 1년 |

**Extension Compliance**: security-baseline — Enabled · 14/15 Compliant · 1 Risk Accepted (SECURITY-11 WAF)
