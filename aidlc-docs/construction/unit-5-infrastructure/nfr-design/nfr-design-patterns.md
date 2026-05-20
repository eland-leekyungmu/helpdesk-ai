# Unit 5 (Infrastructure) — NFR Design Patterns

## 개요
NFR Requirements에서 확정된 요구사항을 **인프라 아키텍처 패턴**으로 변환한 문서입니다.

---

## 1. Network Isolation Pattern

### 패턴: Private-First VPC
- 모든 애플리케이션 워크로드(ECS, RDS)는 **Private 서브넷**에 배치
- 인터넷 접근은 **NAT Gateway** 경유만 허용
- 외부 진입은 **ALB(Public 서브넷)** → ECS(Private) 단방향만

### 구현
```
Internet → IGW → ALB (Public Subnet)
                    ↓ (port 3000)
              ECS Tasks (Private Subnet)
                    ↓ (port 5432)
              RDS (Private Subnet)
                    ↓ (port 443, NAT)
              AWS Services (SQS, SES, Bedrock, etc.)
```

### VPC Endpoints (Q1=C)
- **S3 Gateway Endpoint만** 구성 (무료)
- SQS, Secrets Manager, CloudWatch Logs, ECR 등은 **NAT Gateway 경유**
- 근거: dev 환경 비용 최소화 · NAT Gateway 2개(AZ별)로 가용성 확보 · 보안은 Security Group으로 충분

### Security Group 체인
```
ALB-SG:   inbound 80/443 from 0.0.0.0/0 → outbound 3000 to ECS-SG
ECS-SG:   inbound 3000 from ALB-SG → outbound 5432 to RDS-SG, 443 to 0.0.0.0/0 (NAT)
RDS-SG:   inbound 5432 from ECS-SG only
```

---

## 2. Single Service Identity Pattern

### 패턴: Unified Task Role (Q3=A)
- Next.js 풀스택 모노레포 = **단일 ECS Task = 단일 IAM Role**
- SECURITY-06 최소 권한은 "서비스 단위"로 해석 (전체 앱이 하나의 서비스)
- 모든 유닛이 필요로 하는 AWS 권한을 하나의 Task Role에 합산

### IAM Policy 구조
```
helpdesk-ai-task-role-{env}
├── inline: helpdesk-ai-rds-connect (RDS IAM auth 또는 Secrets 접근)
├── inline: helpdesk-ai-sqs-access (6개 큐 SendMessage/ReceiveMessage/DeleteMessage)
├── inline: helpdesk-ai-ses-send (ses:SendEmail, ses:SendRawEmail)
├── inline: helpdesk-ai-bedrock-invoke (bedrock:InvokeModel, bedrock-agent-runtime:Retrieve)
├── inline: helpdesk-ai-s3-kb (s3:GetObject, s3:PutObject on KB 버킷)
├── inline: helpdesk-ai-secrets-read (secretsmanager:GetSecretValue on 특정 ARN)
├── inline: helpdesk-ai-logs (logs:CreateLogStream, logs:PutLogEvents)
└── inline: helpdesk-ai-opensearch (aoss:APIAccessAll on Collection ARN)
```

### 제약 사항
- 모든 Policy는 **Resource ARN 명시** (와일드카드 금지)
- Bedrock Policy는 **us-east-1 리전 ARN** 지정 (크로스 리전)
- 향후 마이크로서비스 전환 시 Policy를 Role별로 분리하면 됨

---

## 3. Immutable Deployment Pattern

### 패턴: Rolling Update + Immutable Image
- ECS 배포: **Rolling update** (minimumHealthy 100%, maximum 200%)
- Docker 이미지 태그: `helpdesk-ai:<git-short-sha>` (immutable · latest 금지)
- ECR: **이미지 태그 불변성(tag immutability)** 활성화

### 배포 흐름
```
CodeBuild → Docker build → ECR push (tag: abc1234)
         → Manual Approval
         → ECS Task Definition 업데이트 (image: ECR/helpdesk-ai:abc1234)
         → ECS Service Rolling Update
         → 신규 태스크 healthy → 구 태스크 drain
```

---

## 4. Centralized Secrets Pattern

### 패턴: Secrets Manager (Q4=C 반영)
- **DB password**: Secrets Manager 저장 · **Rotation 미구성** (수동 관리)
- **JWT secret**: Secrets Manager 저장 · 수동 관리
- **기타 설정값**: ECS Task Definition 환경 변수 (비민감)

### ECS Task Definition 참조
```json
{
  "secrets": [
    { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:ACCOUNT:secret:helpdesk-ai/dev/db-url" },
    { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:ACCOUNT:secret:helpdesk-ai/dev/jwt-secret" }
  ],
  "environment": [
    { "name": "NODE_ENV", "value": "production" },
    { "name": "AWS_REGION", "value": "ap-northeast-2" },
    { "name": "BEDROCK_REGION", "value": "us-east-1" }
  ]
}
```

---

## 5. Asynchronous Decoupling Pattern

### 패턴: SQS Fan-out (6 큐)
- 동기 요청 경로(사용자 → ALB → ECS)에서 무거운 작업을 **SQS로 오프로드**
- 각 큐는 **독립적 DLQ** 보유 (3회 재시도 후 이동)
- DLQ 메시지 > 0 시 **CloudWatch 알람** 발동

### 처리 패턴
```
[ECS Web Handler] → SQS SendMessage → [ECS Background Worker (동일 컨테이너 내 cron/polling)]
                                              ↓ (실패 3회)
                                         [DLQ] → CloudWatch Alarm → SNS → Email
```

### 워커 구현 방식 (Unit 2/3/4 책임)
- Next.js API Route 기반 cron endpoint 또는 별도 worker 프로세스
- ECS Task 내에서 SQS long-polling (20초)
- Unit 5는 큐/DLQ/알람 인프라만 제공

---

## 6. Observability Stack Pattern

### 패턴: CloudWatch-Centric Monitoring
- **Logs**: CloudWatch Logs (30일 보존)
- **Metrics**: CloudWatch 기본 메트릭 + 커스텀 메트릭 필터 (인증 실패)
- **Alarms**: 표준 세트 (E1=B) → SNS → Email
- **Audit**: CloudTrail Multi-Region + VPC Flow Logs ALL + AWS Config

### 알람 계층
```
Layer 1 (Critical): ECS runningCount < desired, RDS CPU > 80%, ALB 5xx > 10
Layer 2 (Warning):  SQS DLQ > 0, SES Bounce > 5%, OpenSearch OCU > 90%
Layer 3 (Info):     인증 실패 metric filter, Bedrock throttle
```

---

## 7. IaC Single-State Pattern

### 패턴: Monolithic State (Q5=A)
- `infra/environments/dev/main.tf` 하나에 모든 모듈 호출
- Terraform이 모듈 간 의존성을 **자동 해결** (output → input 참조)
- `terraform apply` **1회**로 전체 인프라 프로비저닝

### 장점
- 단순성 · 의존성 관리 자동 · 상태 파일 1개
- 5명 팀에서 Unit 5만 인프라 담당 → 동시 apply 충돌 없음

### 모듈 호출 순서 (Terraform 자동 해결)
```
vpc → (rds, sqs, ses, opensearch, s3) → ecs → alb → cloudwatch → codepipeline
```

---

## 8. CI/CD Manual Gate Pattern

### 패턴: Pipeline with Manual Release + Manual Approval (I1=D, I3=B)
- **Source 트리거**: 비활성 (자동 push 트리거 없음)
- **실행 방식**: CodePipeline 콘솔 "Release change" 버튼 또는 `aws codepipeline start-pipeline-execution`
- **Approval Gate**: Terraform apply 전 · ECS deploy 전 각각 Manual Approval

### 파이프라인 구조
```
[Infra Pipeline]
  Source (CodeCommit, manual) → Plan (CodeBuild) → Approval → Apply (CodeBuild)

[App Pipeline]
  Source (CodeCommit, manual) → Build+Test (CodeBuild) → Docker+ECR (CodeBuild) → Approval → ECS Deploy
```

### CodeBuild 환경 (Q6=B)
- 이미지: `aws/codebuild/amazonlinux2-x86_64-standard:5.0`
- 캐시: **S3 캐시** (node_modules, .terraform)
- 빌드 시간 예상: ~1~2분 (캐시 히트 시)

---

## 9. Cost Awareness Pattern

### 패턴: Tag-Based Cost Allocation + Budget Alert
- **태깅 표준 5종**: Project / Environment / Unit / ManagedBy / Service
- **AWS Budgets**: 월 $700 경보 (SNS 이메일) — dev 환경 안전장치
- **OpenSearch Serverless**: 상시 가동 (Q2=A) — KB 작업 즉시 시작 예정

### dev 월 비용 구조
```
OpenSearch Serverless (2+2 OCU)  ≈ $350  (63%)
NAT Gateway × 2                  ≈ $70   (13%)
RDS db.t4g.small                 ≈ $35   (6%)
ECS Fargate 1 task               ≈ $18   (3%)
ALB                              ≈ $20   (4%)
기타 (S3, SQS, Secrets, Logs)    ≈ $50   (9%)
CloudTrail + Config + Flow Logs  ≈ $10   (2%)
────────────────────────────────────────────
합계                             ≈ $553/월
```

---

## 10. AWS Credential Pattern (로컬 Terraform 실행)

### 패턴: AWS CLI Profile (로컬) + IAM Role (CI/CD)
- **로컬 실행**: `aws configure` → `~/.aws/credentials` 프로필 사용
  - Terraform은 `AWS_PROFILE` 환경 변수 또는 `provider "aws" { profile = "..." }` 로 참조
  - Access Key / Secret Key는 **로컬에만 존재** · 리포지토리 커밋 금지 (SECURITY-12)
- **CodeBuild 실행**: CodeBuild Service Role (IAM Role) → 키 불필요
  - Terraform은 EC2 metadata 또는 환경 변수에서 자동 인식

### .gitignore 필수 항목
```
*.tfstate
*.tfstate.backup
.terraform/
*.tfvars (민감 값 포함 시)
```

---

## SECURITY Compliance (NFR Design 단계)

| Rule | 상태 | 이 단계에서의 적용 |
|---|---|---|
| SECURITY-01 | ✅ | KMS 암호화 전체 · TLS 강제 |
| SECURITY-06 | ✅ | 단일 Role이지만 Resource ARN 명시 · 와일드카드 금지 |
| SECURITY-07 | ✅ | Private-First VPC · SG 체인 |
| SECURITY-09 | ✅ | Immutable image tags · random password |
| SECURITY-10 | ✅ | S3 캐시 · pinned image · npm audit |
| SECURITY-11 | ⚠️ Risk accepted | WAF 없음 · 앱 레이어 rate limit으로 완화 |
| SECURITY-12 | ✅ | Secrets Manager · 로컬 키 커밋 금지 · Rotation 미구성(C) — dev 한정 수용 |
| SECURITY-13 | ✅ | ECR immutable tags · Pipeline IAM 분리 |
| SECURITY-14 | ✅ | CloudWatch 표준 알람 + 인증 실패 |

**⚠️ SECURITY-12 참고**: Rotation 미구성(Q4=C)은 dev 환경 한정으로 수용. prod 전환 시 재검토 필요. audit.md에 기록.
