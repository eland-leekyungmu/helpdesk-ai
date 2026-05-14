# Unit 5 (Infrastructure) — Infrastructure Design

## 개요
논리적 컴포넌트(NFR Design)를 **실제 AWS 서비스 구성**으로 매핑한 최종 인프라 설계 문서입니다.

---

## 1. 전체 아키텍처 요약

| 영역 | 서비스 | 리전 |
|---|---|---|
| Compute | ECS Fargate (1 vCPU / 2 GB) | ap-northeast-2 |
| Database | RDS PostgreSQL 16 (db.t4g.small) | ap-northeast-2 |
| Load Balancer | ALB + ACM + Route 53 | ap-northeast-2 |
| Messaging | SQS × 6 + DLQ × 6 | ap-northeast-2 |
| Email (발송) | SES | ap-northeast-2 |
| Email (수신) | SES + S3 + Lambda | ap-northeast-2 |
| AI/RAG | Bedrock + Knowledge Base | ap-northeast-2 |
| Vector Store | OpenSearch Serverless | ap-northeast-2 |
| KB Data | S3 | ap-northeast-2 |
| Secrets | Secrets Manager | ap-northeast-2 |
| Monitoring | CloudWatch + CloudTrail + Config | ap-northeast-2 |
| CI/CD | CodePipeline + CodeBuild + ECR | ap-northeast-2 |
| IaC State | S3 + DynamoDB | ap-northeast-2 |
| DNS/TLS | Route 53 + ACM | ap-northeast-2 (global) |

---

## 2. 도메인 및 DNS 구성

| 항목 | 값 |
|---|---|
| 기본 도메인 | `ai-dlc.innoplecloud.net` |
| 앱 접근 URL | `https://ai-dlc.innoplecloud.net` |
| SES 인바운드 서브도메인 | `help.ai-dlc.innoplecloud.net` |
| 이메일 수신 주소 예시 | `support@help.ai-dlc.innoplecloud.net` |

### Route 53 레코드

| 레코드 | 타입 | 값 |
|---|---|---|
| `ai-dlc.innoplecloud.net` | A (Alias) | ALB DNS |
| `help.ai-dlc.innoplecloud.net` | MX | `10 inbound-smtp.us-east-1.amazonaws.com` |
| `help.ai-dlc.innoplecloud.net` | TXT (SPF) | `v=spf1 include:amazonses.com ~all` |
| `*._domainkey.help.ai-dlc.innoplecloud.net` | CNAME (DKIM) | SES 제공 값 |
| ACM 검증 | CNAME | ACM 제공 값 |

---

## 3. 리소스 네이밍 컨벤션

**패턴**: `helpdesk-ai-{resource}-{env}`

| 리소스 | 이름 예시 |
|---|---|
| VPC | `helpdesk-ai-vpc-dev` |
| ECS Cluster | `helpdesk-ai-ecs-cluster-dev` |
| ECS Service | `helpdesk-ai-ecs-service-dev` |
| RDS Instance | `helpdesk-ai-rds-dev` |
| ALB | `helpdesk-ai-alb-dev` |
| SQS Queue | `helpdesk-ai-email-inbound-dev` |
| S3 Bucket | `helpdesk-ai-kb-data-dev` |
| ECR Repository | `helpdesk-ai` |
| Secrets | `helpdesk-ai/dev/db-url` |
| CloudWatch Log Group | `/ecs/helpdesk-ai-dev` |
| CodePipeline | `helpdesk-ai-infra-pipeline-dev` |

---

## 4. Compute (ECS Fargate)

| 항목 | dev | prod (placeholder) |
|---|---|---|
| Cluster | `helpdesk-ai-ecs-cluster-dev` | 동일 패턴 |
| Service | `helpdesk-ai-ecs-service-dev` | 동일 |
| Task CPU | **1024** (1 vCPU) | 2048 (2 vCPU) |
| Task Memory | **2048** (2 GB) | 4096 (4 GB) |
| Desired Count | **1** (고정) | 2~10 (Auto Scaling) |
| Launch Type | Fargate On-Demand | 동일 |
| Platform Version | LATEST | 동일 |
| Container Port | 3000 | 동일 |
| Health Check | `/api/health` (HTTP 200) | 동일 |
| Log Driver | awslogs → `/ecs/helpdesk-ai-dev` | 동일 |

### Task Definition 핵심 설정
```json
{
  "family": "helpdesk-ai-dev",
  "cpu": "1024",
  "memory": "2048",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "executionRoleArn": "helpdesk-ai-ecs-execution-role-dev",
  "taskRoleArn": "helpdesk-ai-ecs-task-role-dev",
  "containerDefinitions": [{
    "name": "helpdesk-ai",
    "image": "{account}.dkr.ecr.ap-northeast-2.amazonaws.com/helpdesk-ai:{git-sha}",
    "portMappings": [{ "containerPort": 3000 }],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/helpdesk-ai-dev",
        "awslogs-region": "ap-northeast-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

---

## 5. Database (RDS)

| 항목 | dev |
|---|---|
| Identifier | `helpdesk-ai-rds-dev` |
| Engine | PostgreSQL 16 |
| Instance Class | `db.t4g.small` |
| Storage | 20 GB gp3 · Auto Scaling 최대 500 GB |
| Multi-AZ | No |
| Backup Retention | 3일 · PITR 활성 |
| Encryption | `aws/rds` KMS |
| Parameter Group | `rds.force_ssl=1` |
| Subnet Group | Private 서브넷 2개 |
| Security Group | inbound 5432 from ECS-SG only |
| Master Password | Secrets Manager (`helpdesk-ai/dev/db-url`) |

---

## 6. Network (VPC)

| 항목 | 값 |
|---|---|
| VPC CIDR | `10.0.0.0/16` |
| Public Subnet AZ-a | `10.0.1.0/24` |
| Public Subnet AZ-c | `10.0.2.0/24` |
| Private Subnet AZ-a | `10.0.11.0/24` |
| Private Subnet AZ-c | `10.0.12.0/24` |
| NAT Gateway | 2개 (AZ별) |
| Internet Gateway | 1개 |
| VPC Endpoint | S3 Gateway만 |

### Security Groups

| SG | Inbound | Outbound |
|---|---|---|
| `helpdesk-ai-alb-sg-dev` | 80/443 from 0.0.0.0/0 | 3000 to ECS-SG |
| `helpdesk-ai-ecs-sg-dev` | 3000 from ALB-SG | 443 to 0.0.0.0/0 (NAT) · 5432 to RDS-SG |
| `helpdesk-ai-rds-sg-dev` | 5432 from ECS-SG | 없음 |

---

## 7. Load Balancer (ALB)

| 항목 | 값 |
|---|---|
| Name | `helpdesk-ai-alb-dev` |
| Scheme | internet-facing |
| Subnets | Public × 2 |
| Listener HTTP (80) | Redirect → HTTPS 443 |
| Listener HTTPS (443) | ACM 인증서 · Forward to Target Group |
| Target Group | ECS Service (port 3000) · health check `/api/health` |
| Access Logs | S3 (`helpdesk-ai-alb-logs-dev`) |

---

## 8. Email (SES) — 단일 리전 아키텍처

### 아웃바운드 (ap-northeast-2)
| 항목 | 값 |
|---|---|
| Domain Identity | `ai-dlc.innoplecloud.net` |
| DKIM | Route 53 CNAME 자동 생성 |
| Sandbox | 초기 sandbox · prod 전환 시 해제 요청 |

### 인바운드 (ap-northeast-2)
| 항목 | 값 |
|---|---|
| Domain | `help.ai-dlc.innoplecloud.net` |
| MX Record | `10 inbound-smtp.ap-northeast-2.amazonaws.com` |
| Receipt Rule Set | `helpdesk-ai-inbound-dev` |
| Receipt Rule Action 1 | S3 저장 (`helpdesk-ai-emails-dev`) |
| Receipt Rule Action 2 | Lambda 호출 (`helpdesk-ai-email-forwarder-dev`) |
| Lambda 역할 | SQS SendMessage (동일 리전) |

### 인바운드 흐름
```
[이메일 수신] → SES (ap-northeast-2) → Receipt Rule
    ├── S3 저장 (원본 보관)
    └── Lambda 호출
            ↓
        SQS SendMessage (ap-northeast-2, helpdesk-ai-email-inbound-dev)
            ↓
        [ECS Worker] 이메일 파싱 + 티켓 생성
```

---

## 9. AI/RAG (ap-northeast-2)

| 항목 | 값 |
|---|---|
| Bedrock Models | Claude 3.5 Sonnet · Claude 3 Haiku · Titan Embeddings v2 |
| Knowledge Base | `helpdesk-ai-kb-dev` |
| Data Source | S3 (`helpdesk-ai-kb-docs-dev`, ap-northeast-2) |
| Vector Store | OpenSearch Serverless Collection (`helpdesk-ai-vectors-dev`) |
| OCU | Indexing 2 / Search 2 (최소) |
| Embedding Model | `amazon.titan-embed-text-v2:0` |
| KB IAM Role | `helpdesk-ai-bedrock-kb-role-dev` |

---

## 10. Messaging (SQS)

6개 큐 + 6개 DLQ · 모두 ap-northeast-2 · Standard · Visibility 30s · MaxReceive 3 · `aws/sqs` KMS

| 큐 | DLQ |
|---|---|
| `helpdesk-ai-email-inbound-dev` | `helpdesk-ai-email-inbound-dlq-dev` |
| `helpdesk-ai-email-outbound-dev` | `helpdesk-ai-email-outbound-dlq-dev` |
| `helpdesk-ai-llm-logging-dev` | `helpdesk-ai-llm-logging-dlq-dev` |
| `helpdesk-ai-feedback-accumulate-dev` | `helpdesk-ai-feedback-accumulate-dlq-dev` |
| `helpdesk-ai-kb-reindex-dev` | `helpdesk-ai-kb-reindex-dlq-dev` |
| `helpdesk-ai-assignment-events-dev` | `helpdesk-ai-assignment-events-dlq-dev` |

---

## 11. Secrets Manager

| Secret 이름 | 내용 |
|---|---|
| `helpdesk-ai/dev/db-url` | PostgreSQL 연결 문자열 |
| `helpdesk-ai/dev/jwt-secret` | JWT 서명 키 |

Rotation 미구성 (dev 한정).

---

## 12. CI/CD

### Infra Pipeline (`helpdesk-ai-infra-pipeline-dev`)
```
Source (CodeCommit, manual trigger)
  → Plan (CodeBuild: terraform fmt/validate/plan)
  → Manual Approval (SNS 알림)
  → Apply (CodeBuild: terraform apply)
```

### App Pipeline (`helpdesk-ai-app-pipeline-dev`)
```
Source (CodeCommit, manual trigger)
  → Build+Test (CodeBuild: npm ci, npm test, npm audit)
  → Docker+ECR (CodeBuild: docker build, ecr push)
  → Manual Approval (SNS 알림)
  → ECS Deploy (ECS rolling update)
```

### CodeBuild 공통
- Image: `aws/codebuild/amazonlinux2-x86_64-standard:5.0`
- Cache: S3 (`helpdesk-ai-codebuild-cache-dev`)
- Compute: `BUILD_GENERAL1_SMALL`

---

## 13. Monitoring

### CloudWatch Alarms (15개)
- ECS Health · RDS CPU · RDS Storage · ALB 5xx
- SQS DLQ × 6 · Bedrock Throttle · SES Bounce · OpenSearch OCU · Auth Failure

### SNS Topic
- `helpdesk-ai-alerts-dev` → 이메일 구독

### Log Groups (30일 보존)
- `/ecs/helpdesk-ai-dev`
- `/aws/lambda/helpdesk-ai-email-forwarder-dev`

### CloudTrail + VPC Flow + Config
- CloudTrail: Multi-Region · S3 저장 · 로그 검증
- VPC Flow: ALL → CloudWatch Logs
- Config: 기본 규칙 세트

---

## 14. S3 Buckets

| 버킷 | 리전 | 용도 |
|---|---|---|
| `helpdesk-ai-tfstate-dev` | ap-northeast-2 | Terraform state |
| `helpdesk-ai-alb-logs-dev` | ap-northeast-2 | ALB 액세스 로그 |
| `helpdesk-ai-emails-dev` | ap-northeast-2 | SES 인바운드 이메일 원본 |
| `helpdesk-ai-kb-docs-dev` | ap-northeast-2 | KB 엔트리 (JSON/TXT) |
| `helpdesk-ai-codepipeline-dev` | ap-northeast-2 | Pipeline 아티팩트 |
| `helpdesk-ai-codebuild-cache-dev` | ap-northeast-2 | CodeBuild 캐시 |

모든 버킷: Public Access Block · `aws/s3` KMS · 버전 관리 (tfstate만) · Lifecycle (logs 30일 → Glacier)

---

## 15. IAM Roles

| Role | 용도 |
|---|---|
| `helpdesk-ai-ecs-task-role-dev` | 앱 실행 시 AWS 서비스 접근 |
| `helpdesk-ai-ecs-execution-role-dev` | ECS Agent (이미지 pull, 로그) |
| `helpdesk-ai-codebuild-role-dev` | CodeBuild 실행 |
| `helpdesk-ai-codepipeline-role-dev` | CodePipeline 오케스트레이션 |
| `helpdesk-ai-bedrock-kb-role-dev` | Bedrock KB → S3/OpenSearch 접근 |
| `helpdesk-ai-email-forwarder-role-dev` | Lambda (SES → SQS 전달) |

---

## 16. Bootstrap (최초 1회)

```
infra/bootstrap/
├── main.tf    → S3 bucket (helpdesk-ai-tfstate-dev) + DynamoDB (helpdesk-ai-tfstate-lock)
├── variables.tf
└── outputs.tf
```

실행: `cd infra/bootstrap && terraform init && terraform apply`
이후 모든 환경은 이 S3 backend를 사용.

---

## 17. 태깅 (default_tags)

```hcl
default_tags {
  tags = {
    Project     = "helpdesk-ai"
    Environment = "dev"
    Unit        = "unit-5-infra"
    ManagedBy   = "terraform"
    Service     = "aidlc-ithelp"
  }
}
```
