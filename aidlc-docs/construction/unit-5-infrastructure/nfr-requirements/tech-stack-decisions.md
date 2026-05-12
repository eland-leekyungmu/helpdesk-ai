# Unit 5 (Infrastructure) — Tech Stack Decisions

## 개요
Unit 5가 **dev 환경을 실제 프로비저닝**하고 **prod 환경 구조만 placeholder**로 둔다는 전제 하에 내린 기술 스택 결정입니다.

---

## 1. Cloud & Region

| 항목 | 결정 | 근거 |
|---|---|---|
| Cloud Provider | **AWS** | Entry Q4=A |
| Primary Region | **ap-northeast-2** (서울) | Entry Q4=A · 한국 사용자 레이턴시 최적 |
| Bedrock Region | **us-east-1** (버지니아) | G2=A · 모델 가용성 (Titan Embed v2, Claude, Nova) · 크로스 리전 TLS 호출 |
| AWS Account 수 | **단일 계정** | Entry Q4=A · MVP 단순화 |

---

## 2. Compute

| 항목 | dev | prod (placeholder) | 근거 |
|---|---|---|---|
| Container Platform | ECS Fargate | ECS Fargate | 서버리스 · 패치 관리 최소 |
| Launch Type | **On-Demand** | **On-Demand** | H1=C · 안정성 우선 |
| Task desiredCount | **1 (고정)** | 최소 2 / 최대 10 | A1=A · dev는 고정 · prod는 Auto Scaling |
| CPU/Memory (dev) | 0.5 vCPU · 1GB | 1 vCPU · 2GB (권장 초기값) | 최소 부하 기준 · NFR Design에서 최종 |
| Node.js Base Image | `node:22-alpine` | 동일 | G1=A · 최신 LTS · 경량 |

---

## 3. Database

| 항목 | dev | prod (placeholder) | 근거 |
|---|---|---|---|
| Engine | PostgreSQL 16 | PostgreSQL 16 | `schema.prisma` datasource · `docker-compose` 일치 |
| Instance Class | **db.t4g.small** (2 vCPU, 2 GB) | **db.m7g.large** (2 vCPU, 8 GB) | A2=B · dev는 최소 · prod Graviton |
| Storage Type | gp3 | gp3 | B1=A · 범용 SSD · 비용 효율 |
| Storage (initial) | **20 GB** | **100 GB** | B1=A · Auto Scaling 최대 500GB |
| Multi-AZ | 아니오 | 예 | C1=B · prod만 HA |
| Backup Retention | **3일** | **14일** · PITR | C1=B |
| Encryption | `aws/rds` KMS | 동일 | SECURITY-01, D1=A |
| Parameter Group | `rds.force_ssl=1` 커스텀 | 동일 | SECURITY-01 · TLS 강제 |

---

## 4. Network

| 항목 | 결정 | 근거 |
|---|---|---|
| VPC CIDR | 10.0.0.0/16 | 신규 VPC · Entry Q4=A |
| AZ 개수 | 2 | D2=A · 표준 HA · dev도 동일 |
| Subnet 구조 | Public × 2 · Private × 2 | D2=A |
| NAT Gateway | **2개** (AZ별) | D2=A · AZ 장애 격리 |
| Internet Gateway | 1 (Public 서브넷용) | - |
| VPC Endpoints | S3 (Gateway) · SQS/Secrets/Logs/ECR (Interface) | SECURITY-01/07 · NAT 비용 절감 · **NFR Design에서 최종 선정** |

---

## 5. Load Balancer & Entry

| 항목 | 결정 | 근거 |
|---|---|---|
| Load Balancer | Application Load Balancer (ALB) | HTTP/HTTPS 라우팅 · target group health check |
| TLS 인증서 | AWS Certificate Manager (ACM) | D5=A · 자동 갱신 · 비용 없음 |
| Domain | Route 53 호스팅 영역 | D5=A · ALB에 A ALIAS 레코드 |
| WAF | **없음** (MVP) | D4=A · 애플리케이션 레이어 rate limit으로 완화 · prod 전환 시 추가 |
| HTTP → HTTPS | 301 redirect | SECURITY-01 · TLS 강제 |

---

## 6. AI/RAG Stack

| 항목 | 결정 | 근거 |
|---|---|---|
| LLM Provider | AWS Bedrock | Inception 결정 |
| Bedrock 호출 방식 | **크로스 리전 TLS** (ap-northeast-2 → us-east-1 인터넷 경유) | G2=A · PrivateLink 미사용 (MVP) |
| RAG 구성 | **Bedrock Knowledge Base** | Entry Clarification 2=A · 앱은 KB API만 호출 |
| Vector Store | **OpenSearch Serverless** | Entry Clarification 2=A · Bedrock KB 기본 연동 |
| OpenSearch Sizing | **최소 OCU (Indexing 2 + Search 2)** | G3=A · 10만건 규모에 여유 충분 · dev/prod 공통 시작 |
| Embedding Model | `amazon.titan-embed-text-v2:0` (1536 차원) | Titan v2 · us-east-1 가용 |
| KB Data Source | S3 버킷 (`helpdesk-ai-kb-{env}`) | Bedrock KB S3 데이터 소스 연결 |

**⚠️ 비용 주의**: OpenSearch Serverless 최소 4 OCU × $0.24/h ≈ **$346/월**. 개발 중단 시 Collection 삭제/재생성 운영 옵션 (NFR Design에서 절차 정의).

---

## 7. Messaging

| 항목 | 결정 | 근거 |
|---|---|---|
| Queue Service | Amazon SQS | Inception 결정 |
| Queue Type | **Standard** (6개 모두) | B2=A · 중복/순서 엄격성 불필요 |
| Visibility Timeout | 30초 | B2=A |
| Max Receive Count | 3 → DLQ | B2=A |
| DLQ | 6개 모두 구성 · CloudWatch 알람 | E1=B · SECURITY-14 |
| Encryption | `aws/sqs` KMS | SECURITY-01 · D1=A |

**큐 목록 (6개 + 6개 DLQ)**
1. helpdesk-email-inbound
2. helpdesk-email-outbound
3. helpdesk-llm-logging
4. helpdesk-feedback-accumulate
5. helpdesk-kb-reindex
6. helpdesk-assignment-events

---

## 8. Email (SES)

| 항목 | 결정 | 근거 |
|---|---|---|
| Service | Amazon SES | Requirements · Email Service |
| 도메인 인증 | Route 53에 DKIM/SPF/DMARC 레코드 | D5=A · SPF hard fail · DKIM 1024+ |
| 인바운드 | SES Rule Set · 특정 도메인으로 수신 → S3 → Lambda | application-design/services.md |
| 아웃바운드 | SES v2 SendEmail API | Unit 2 호출 |
| Sandbox 탈출 | 초기는 sandbox (샌드박스 이메일만 수신) · prod 요청 시 해제 | MVP |

---

## 9. Secrets & Config

| 항목 | 결정 | 근거 |
|---|---|---|
| Secrets Manager | **AWS Secrets Manager** | D3=A · rotation 지원 |
| Secrets 대상 | DB password · JWT secret · Bedrock (IAM role이므로 불필요) | Inception |
| Rotation | DB password 90일 자동 | SECURITY-12 |
| Config (비민감) | Terraform variables · ECS Task Definition env vars | MVP |
| Parameter Store | 미사용 | D3=A · Secrets Manager 통일 |

---

## 10. Observability

| 항목 | 결정 | 근거 |
|---|---|---|
| Logs | CloudWatch Logs | SECURITY-03 |
| Log Retention | **30일** (애플리케이션/ALB/VPC Flow 공통) | E2=B |
| CloudTrail | Multi-Region trail · S3 저장 · **로그 파일 검증 활성** | J2=B · SECURITY-13 |
| CloudTrail 보존 | S3 Lifecycle로 1년 | Compliance |
| VPC Flow Logs | **ALL** (accept + reject) · CloudWatch Logs | J2=B · SECURITY-14 |
| AWS Config | **기본 규칙 세트** 활성 | J2=B |
| Alarms | **표준 세트 + 인증 실패** | E1=B · SECURITY-14 |
| Alerts 채널 | SNS Topic → 이메일 구독 | MVP |
| Metrics 대시보드 | CloudWatch Dashboard × 2 (ECS/RDS · SQS/Bedrock) | NFR Design에서 확정 |

---

## 11. CI/CD

| 항목 | 결정 | 근거 |
|---|---|---|
| Source Control | AWS CodeCommit | Entry Clarification 1.2=A (기존 리포지토리) |
| Build Service | AWS CodeBuild | Entry Clarification 1.2=A |
| Pipeline | **AWS CodePipeline × 2** | I2=B · Infra/App 분리 |
| Source 트리거 | **Manual Release (자동 트리거 비활성)** | I1=D · 명시적 제어 |
| Manual Approval | dev/prod 모두 필수 | I3=B |
| Artifact Storage | S3 (암호화) | CodePipeline default |
| Container Registry | Amazon ECR (private) | 이미지 스캔 on push · immutable tags |

**파이프라인 구성**
- **Infra Pipeline**: CodeCommit Source → `terraform fmt/validate/plan` (CodeBuild) → Manual Approval → `terraform apply` (CodeBuild)
- **App Pipeline**: CodeCommit Source → `npm ci && npm test` (CodeBuild) → Docker build + ECR push (CodeBuild) → Manual Approval → ECS Deploy

---

## 12. IaC

| 항목 | 결정 | 근거 |
|---|---|---|
| Tool | **Terraform** | Inception |
| Module 구조 | **환경 × 모듈** (F2=A) | `infra/environments/{dev,prod}/` + `infra/modules/*` |
| Terraform Version | **>= 1.9** | 최신 stable · NFR Design에서 정확한 pinning |
| AWS Provider | **>= 5.70** | - |
| State Backend | S3 (버전 관리 · 암호화) + DynamoDB lock | Entry Clarification 1.1=A |
| Bootstrap | `infra/bootstrap/` 별도 모듈 · 로컬 backend 최초 apply | Entry Clarification 1.1=A |

---

## 13. Local Development

| 항목 | 결정 | 근거 |
|---|---|---|
| Docker Compose | **유지** (PostgreSQL 1서비스) | Entry Clarification 3 v2=A |
| 로컬 PG | Unit 5 담당자 로컬 설치 PG 사용 · 타 유닛은 선택 | Entry Clarification 3 v2=A |
| Prisma | `prisma migrate dev` 로컬 · `prisma migrate deploy` CI/CD | 기존 schema.prisma 유지 |

---

## 14. 태깅 표준 (F1=D)

Terraform `provider "aws"` 블록의 `default_tags` 로 전역 적용:

```hcl
provider "aws" {
  region = "ap-northeast-2"

  default_tags {
    tags = {
      Project     = "helpdesk-ai"
      Environment = var.environment   # "dev" or "prod"
      Unit        = "unit-5-infra"    # 리소스 실제 소유 유닛으로 override 가능
      ManagedBy   = "terraform"
      Service     = "aidlc-ithelp"
    }
  }
}
```

리소스 단위로 `Unit` 태그 override (예: SQS email-inbound 큐는 `Unit = "unit-2-intake-routing"`).

---

## 15. 요약 (한눈에 보기)

```
Cloud:        AWS (ap-northeast-2, Bedrock cross-region us-east-1)
Compute:      ECS Fargate · On-Demand · node:22-alpine
Database:     RDS PostgreSQL 16 · dev t4g.small / prod m7g.large · gp3
Network:      VPC /16 · 2-AZ · NAT Gateway × 2
Entry:        ALB + ACM + Route 53 · WAF 없음 (MVP)
AI/RAG:       Bedrock KB + OpenSearch Serverless (2+2 OCU) + S3 데이터 소스
Messaging:    SQS × 6 + DLQ × 6 · Standard · 30s visibility
Email:        SES (sandbox 시작)
Secrets:      Secrets Manager (DB password 90일 rotation)
Logs:         CloudWatch 30d · CloudTrail Multi-Region · VPC Flow ALL
CI/CD:        CodeCommit + CodePipeline × 2 + CodeBuild + ECR · Manual Release
IaC:          Terraform >= 1.9 · S3 backend + DynamoDB lock · 환경×모듈 구조
태깅:         Project / Environment / Unit / ManagedBy / Service
```
