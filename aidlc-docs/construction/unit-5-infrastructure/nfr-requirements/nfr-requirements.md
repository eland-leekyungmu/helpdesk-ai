# Unit 5 (Infrastructure) — NFR Requirements

## 개요
- **Unit**: Unit 5 (Infrastructure)
- **Scope**: dev 환경 실제 프로비저닝 · prod는 variable/디렉토리 placeholder만 구성
- **Track**: Fast-track (Functional Design skip · 인프라 유닛)
- **Inputs**: `requirements.md` NFR-01~07, `components.md`, `services.md`, `database-design.md`, `unit-of-work.md`, SECURITY-01~15

## 상위 NFR 매핑

| Inception NFR | Unit 5 구현 책임 |
|---|---|
| NFR-01 (24/7) | Multi-AZ RDS (prod) · ECS 최소 2 태스크 (prod) · Rolling update 무중단 배포 |
| NFR-02 (5000명) | ECS Auto Scaling 최대 10 · ALB · RDS m7g.large (prod) |
| NFR-03 (5초 응답) | RDS gp3 · SQS 비동기 오프로드 · Bedrock 크로스 리전 TLS |
| NFR-04 (확장성) | ECS Auto Scaling · RDS Storage Auto Scaling · OpenSearch Serverless 탄력적 OCU |
| NFR-05 (보안) | SECURITY-01~15 섹션 참조 |
| NFR-06 (비용) | 태깅 표준 · 비용 알람(표준 세트) · prod m7g (Graviton) |
| NFR-07 (데이터) | S3 KB 데이터 소스 · OpenSearch Serverless 벡터 스토어 |

---

## 1. Scalability (확장성)

### 1.1 ECS Fargate Auto Scaling
- **dev**: desiredCount **1** 고정 (H2=B 24/7 가동 · Auto Scaling 비활성)
- **prod (placeholder)**: 
  - minCapacity **2** · maxCapacity **10**
  - 트리거: Target Tracking on ECS Service CPUUtilization **70%**
  - Scale-out cooldown 60s · Scale-in cooldown 300s
- **근거**: 5000명 동시 사용자 기준 평균 CPU 30~50% 예상, 70% 트리거는 부하 급증 대응

### 1.2 RDS 인스턴스 클래스
- **dev**: `db.t4g.small` (2 vCPU · 2GB RAM · Graviton)
- **prod (placeholder)**: `db.m7g.large` (2 vCPU · 8GB RAM · Graviton)
- **Storage Auto Scaling**: 활성 · 최대 500GB

### 1.3 SQS 확장
- **표준 큐 6개** — 자동 확장 (AWS 관리형)
- Visibility timeout 30초 · Max receive count 3 → DLQ
- 부하 시 메시지 적체는 DLQ 알람으로 감지

---

## 2. Performance (성능)

### 2.1 RDS 스토리지
- **dev**: 20GB gp3 (baseline 3000 IOPS · 125 MB/s)
- **prod (placeholder)**: 100GB gp3 · Auto Scaling 최대 500GB
- **근거**: 11개 테이블 초기 데이터셋 < 10GB · 1년 성장 여유 10배

### 2.2 SQS 처리 시간
- Visibility timeout 30초 — 일반 워커 처리에 충분
- 긴 작업(KB reindex)은 별도 큐 · 워커 내부 long-polling 20초

### 2.3 Bedrock 호출 성능
- Bedrock 호출은 **us-east-1 크로스 리전** (G2=A)
- 예상 추가 레이턴시 150~200ms (vs 동일 리전)
- NFR-03 (5초 응답) 여유 범위 내 — TLS + 한 번 호출 기준 이내

---

## 3. Availability (가용성)

### 3.1 Multi-AZ
- **dev**: Single-AZ (비용 절감 · C1=B)
- **prod (placeholder)**: Multi-AZ RDS · ECS 2+ AZ

### 3.2 RDS Backup
- **dev**: Automated backup **3일** 보존 · PITR 활성
- **prod (placeholder)**: Automated backup **14일** 보존 · PITR 활성

### 3.3 RTO / RPO
- **dev**: RTO 24시간 · RPO 24시간 (best-effort)
- **prod (placeholder)**: RTO **1시간** · RPO **15분**
- **근거**: MVP 표준 · 24/7 서비스는 prod 기준

### 3.4 ECS 배포 전략
- **Rolling update** · minimumHealthyPercent **100** · maximumPercent **200**
- 무중단 배포 (2배 태스크 기동 후 구 버전 drain)
- dev/prod 공통

### 3.5 Disaster Recovery
- 기본 RDS 자동 백업만 (J1=A)
- 크로스 리전 DR 미구성 (MVP)

---

## 4. Security (보안) — SECURITY-01~15 적용

### 4.1 Encryption (SECURITY-01)
- **At rest**: 모든 데이터 저장소 AWS 관리형 KMS 암호화 (D1=A)
  - RDS: `aws/rds` 관리형 키
  - S3 (KB 데이터 · tfstate · ALB 로그): `aws/s3` 관리형 키
  - SQS: `aws/sqs` 관리형 키
  - Secrets Manager: `aws/secretsmanager` 관리형 키
  - CloudWatch Logs: `aws/logs` 관리형 키
- **In transit**: 모든 엔드포인트 TLS 1.2+
  - ALB: ACM 인증서 (D5=A · Route 53 + ACM)
  - RDS: `rds.force_ssl=1` 파라미터
  - S3: bucket policy로 aws:SecureTransport 강제

### 4.2 Access Logging (SECURITY-02)
- **ALB 액세스 로그** → S3 (전용 버킷 · KMS 암호화 · 30일 retention → S3 Lifecycle로 Glacier)
- **CloudTrail** → S3 (모든 리전 · 로그 파일 검증 · J2=B)
- **VPC Flow Logs (ALL)** → CloudWatch Logs (J2=B)

### 4.3 Application Logging (SECURITY-03)
- **CloudWatch Logs 로그 그룹**: `/aws/ecs/helpdesk-ai-{env}/*`
- **보존 기간**: 30일 (E2=B)
- **구조화 로깅**: 각 유닛 애플리케이션 책임 (Unit 5는 로그 그룹 프로비저닝만)

### 4.4 HTTP Security Headers (SECURITY-04)
- ALB 자체는 HSTS header 주입 불가 → **Next.js 애플리케이션 middleware에서 주입** (Unit 1 책임)
- Unit 5는 ALB가 HTTPS only를 강제 (HTTP 80 → HTTPS 443 redirect)

### 4.5 Input Validation (SECURITY-05)
- ALB body size limit (**1MB**)
- 초과 페이로드는 ALB에서 413 반환

### 4.6 IAM Least Privilege (SECURITY-06)
- ECS Task Role: 유닛별 분리
  - Unit 2 Task Role: 필요 SQS 큐 3개 · RDS 접근 · SES:SendEmail
  - Unit 3 Task Role: Bedrock:InvokeModel(us-east-1) · S3(KB 버킷) · OpenSearch Serverless APIAccessAll
  - Unit 4 Task Role: RDS 접근 · SQS(logging/kb-reindex) · CloudWatch Logs
  - Unit 1 Task Role: RDS 읽기 전용 · 나머지는 같은 프로세스이므로 Unit 2/3/4 권한 상속 (Next.js 풀스택 구조 고려 — NFR Design에서 최종 확정)
- 자원 단위 ARN 지정 · 와일드카드 금지

### 4.7 Network (SECURITY-07)
- **VPC 2-AZ · Public/Private 각 2개 · NAT Gateway 2개** (D2=A)
- CIDR 예: 10.0.0.0/16 · Public 10.0.1.0/24, 10.0.2.0/24 · Private 10.0.11.0/24, 10.0.12.0/24
- Security Group:
  - ALB-SG: inbound 80/443 from 0.0.0.0/0 · outbound to ECS-SG on 3000
  - ECS-SG: inbound 3000 from ALB-SG only · outbound HTTPS(443) · RDS 5432
  - RDS-SG: inbound 5432 from ECS-SG only
- Private 서브넷은 NAT 경유만 · IGW 직접 경로 없음
- **VPC 엔드포인트**: S3 (Gateway · 무료) · SQS · Secrets Manager · CloudWatch Logs · ECR API/DKR (Interface · 비용 있음) — NFR Design에서 세부 결정

### 4.8 Application Access Control (SECURITY-08)
- Unit 4(Auth) 책임 — Unit 5는 Secrets Manager에 JWT secret 저장

### 4.9 Hardening (SECURITY-09)
- **No default credentials**: RDS master password는 Terraform이 생성한 random_password → Secrets Manager (D3=A)
- **S3 public access block**: 모든 버킷
- **ECS 최소 이미지**: `node:22-alpine` (G1=A)
- **에러 응답 미노출**: ALB 기본 에러 페이지 오버라이드 불필요 (애플리케이션이 JSON 에러 반환)

### 4.10 Supply Chain (SECURITY-10)
- `package-lock.json` 커밋 (기존 프로젝트 유지)
- **ECR 이미지 스캔 on push 활성화**
- CodeBuild buildspec에 `npm audit --audit-level=high` 포함
- Dockerfile: `FROM node:22-alpine` (latest 태그 금지 — 구체 버전 pinning은 NFR Design에서 패치 정책 결정)

### 4.11 Secure Design (SECURITY-11)
- **Rate limiting**: MVP에서 WAF 없음 (D4=A) → ALB는 기본 rate limit 없음
  - **완화 조치**: 애플리케이션 레벨 rate limit (Unit 1/2/4가 Next.js middleware 구현) — SECURITY-11 verification pass 가능
  - **향후 이관**: prod 전환 시 WAF rate-based rule 추가 (D4=A 의도대로 점진적 보강)

### 4.12 Auth & Credential (SECURITY-12)
- **Secrets Manager** (D3=A): DB password · JWT secret · Bedrock 미사용(IAM role)
- **Rotation**: DB password 자동 rotation 90일 주기 (Lambda function 생성)
- **No hardcoded**: IaC에 평문 비밀 금지 · `sensitive = true` 변수 사용

### 4.13 Integrity (SECURITY-13)
- CodeCommit은 IAM 정책으로 write 접근 제한
- Pipeline 정의 변경은 별도 IAM policy (개발자는 Source/Build read-only)
- ECR 이미지 태그: `helpdesk-ai:<git-sha>` 불변 (mutable 금지)

### 4.14 Alerting & Monitoring (SECURITY-14)
- **CloudWatch Alarms (표준 세트, E1=B)**:
  - ECS Service Health: runningCount < desiredCount (5분)
  - RDS CPU > 80% (10분)
  - RDS FreeStorageSpace < 20%
  - ALB 5xx > 10 (5분)
  - SQS DLQ ApproximateNumberOfMessagesVisible > 0 (6개 큐 각각)
  - Bedrock ThrottlingException (CloudWatch Logs metric filter)
  - SES Bounce rate > 5%
  - OpenSearch Serverless SearchIndexCapacity > 90%
  - **인증 실패 metric filter** (CloudWatch Logs filter: "login failed" · SNS 알림)
- **SNS 알림 주제**: `helpdesk-ai-alerts-{env}` (이메일 구독)
- **로그 보존**: 30일 (E2=B) · CloudTrail은 S3 lifecycle로 1년 보존

### 4.15 Exception Handling (SECURITY-15)
- ALB: 502/504 기본 에러 페이지
- ECS health check: `/api/health` (Unit 1 책임)
- Unit 5는 ALB target group health check 구성

---

## 5. Reliability (신뢰성)
- CloudWatch 알람: 4.14 참조
- ECS health check: ALB target group + container-level
- RDS Event Subscription: SNS로 주요 이벤트 알림

---

## 6. Maintainability (유지보수성)

### 6.1 태깅 표준 (F1=D)
모든 AWS 리소스에 필수 태그 5종 (Terraform default_tags):

| 태그 키 | 값 예시 | 용도 |
|---|---|---|
| `Project` | `helpdesk-ai` | 프로젝트 식별 |
| `Environment` | `dev` / `prod` | 환경 분리 |
| `Unit` | `unit-5-infra` 또는 리소스 실제 소유 유닛 | 책임 경계 |
| `ManagedBy` | `terraform` | IaC 관리 표식 |
| `Service` | `aidlc-ithelp` | 서비스 식별 |

### 6.2 Terraform 모듈 구조 (F2=A)
```
infra/
├── bootstrap/              # 최초 1회: tfstate S3 + DynamoDB lock
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── modules/                # 재사용 모듈
│   ├── vpc/
│   ├── ecs/
│   ├── rds/
│   ├── sqs/
│   ├── ses/
│   ├── opensearch-serverless/
│   ├── bedrock-kb/
│   ├── cloudwatch/
│   ├── codecommit-cicd/    # CodePipeline + CodeBuild
│   └── iam/
└── environments/
    ├── dev/                # 실제 apply 대상
    │   ├── main.tf
    │   ├── backend.tf
    │   ├── terraform.tfvars
    │   └── outputs.tf
    └── prod/               # placeholder
        ├── main.tf
        ├── backend.tf
        └── terraform.tfvars.example
```

### 6.3 Terraform 버전 및 Provider
- Terraform **>= 1.9** (이후 NFR Design에서 정확한 pinning)
- AWS Provider **>= 5.70** (최신 기능 활용)

---

## 7. Cost (비용)

### 7.1 결정 사항
- **ECS Fargate**: dev/prod 모두 **On-Demand** (H1=C · 안정성 우선)
- **dev 24/7 가동** (H2=B)
- **OpenSearch Serverless 최소 OCU (2+2)** (G3=A)

### 7.2 dev 환경 월 예상 비용 (참고)
| 항목 | 월 예상 |
|---|---|
| ECS Fargate 1 태스크 (0.5 vCPU · 1GB) 24/7 | ~$18 |
| RDS db.t4g.small + 20GB gp3 | ~$35 |
| NAT Gateway × 2 | ~$70 |
| OpenSearch Serverless 2+2 OCU | **~$350** |
| ALB | ~$20 |
| S3 · SQS · Secrets · CloudWatch Logs · Bedrock | ~$10~50 |
| **합계** | **~$500~550 / 월** |

**비용 경고**: OpenSearch Serverless가 dev 비용의 절반 이상을 차지합니다. **테스트 기간에만 띄우는 운영 방식** 권장 — Terraform 모듈에 `enable_opensearch = false` 변수 스위치 포함 (NFR Design 단계에서 구현).

### 7.3 비용 알람 (J2에는 미포함이지만 E1 표준 세트 확장 고려)
- **AWS Budgets 월 $700 경보** (SNS 이메일) — MVP 안전장치
- NFR Design에서 최종 결정

---

## 8. CI/CD

### 8.1 전략
- **소스**: CodeCommit (기존 리포지토리 사용)
- **브랜치**: 현재 `main` + `feat/unit1*`~`feat/unit5*` · 최종 통합 머지 후 main 업데이트
- **트리거**: **수동 릴리스 (Manual Release)** — Source Stage의 자동 트리거 비활성 · CodePipeline 콘솔의 "Release change" 버튼 클릭 시 실행 (I1=D)
- **파이프라인 분리**: 2개 (I2=B)
  - **Infra Pipeline**: Source → Terraform Plan → Manual Approval → Terraform Apply
  - **App Pipeline**: Source → npm build/test → Docker build → ECR push → ECS Deploy (Manual Approval 선행)

### 8.2 Manual Approval
- dev/prod **모두 Manual Approval 필수** (I3=B) — SNS Topic으로 승인 요청 알림
- 승인자: 프로젝트 팀원 IAM user

### 8.3 Bootstrap
- tfstate S3 + DynamoDB lock은 **별도 bootstrap 모듈** 로컬 apply (1회)
- 이후 모든 환경은 S3 backend 사용

---

## 9. Compliance

### 9.1 감사 로그 (J2=B)
- **CloudTrail**: 모든 리전 · S3 저장 · 로그 파일 검증 · Multi-Region trail
- **VPC Flow Logs (ALL)**: CloudWatch Logs → S3 아카이브 (1년)
- **AWS Config**: 기본 규칙 세트 활성 (encrypted-volumes, s3-bucket-public-read-prohibited 등)

### 9.2 적용 대상 아닌 규정
- HIPAA/PCI-DSS/SOC2 — 본 프로젝트 범위 아님 (security baseline만)

---

## 10. SECURITY Compliance Summary

| Rule | 상태 | 근거 |
|---|---|---|
| SECURITY-01 Encryption | ✅ Compliant | 4.1 KMS 암호화 전체 · TLS 1.2+ |
| SECURITY-02 Access Logging | ✅ Compliant | 4.2 ALB/CloudTrail/VPC Flow |
| SECURITY-03 App Logging | ✅ Compliant | 4.3 CloudWatch Logs · 30일 |
| SECURITY-04 HTTP Headers | 🟡 Shared | Unit 1(Next.js middleware)이 주체 · Unit 5는 HTTPS 강제만 |
| SECURITY-05 Input Validation | 🟡 Shared | ALB body size limit · 애플리케이션 레이어는 각 유닛 |
| SECURITY-06 Least Privilege | ✅ Compliant | 4.6 ECS Task Role 분리 · 자원 ARN 지정 |
| SECURITY-07 Network | ✅ Compliant | 4.7 Private 서브넷 · SG 제한 |
| SECURITY-08 AuthZ | 🟡 Shared | Unit 4 Auth 책임 · Unit 5는 Secrets 제공 |
| SECURITY-09 Hardening | ✅ Compliant | 4.9 S3 PAB · random password · 최소 이미지 |
| SECURITY-10 Supply Chain | ✅ Compliant | 4.10 lock file · ECR scan · npm audit |
| SECURITY-11 Secure Design | ⚠️ Risk accepted | 4.11 WAF 없음 — 애플리케이션 rate limit로 완화 · prod 전환 시 WAF 추가 |
| SECURITY-12 Auth & Credential | ✅ Compliant | 4.12 Secrets Manager rotation |
| SECURITY-13 Integrity | ✅ Compliant | 4.13 IAM 분리 · ECR immutable tags |
| SECURITY-14 Alerting | ✅ Compliant | 4.14 표준 알람 + 인증 실패 · 30일 보존 · CloudTrail 1년 |
| SECURITY-15 Exception Handling | 🟡 Shared | ALB/ECS health check는 Unit 5 · 애플리케이션 에러 핸들러는 각 유닛 |

**🟡 Shared**: Unit 5가 인프라 기반을 제공하고 다른 유닛이 애플리케이션 레이어에서 완성. 각 유닛 NFR Design에서 최종 검증.
**⚠️ Risk accepted**: MVP 최소주의 · prod 전환 시 해소 예정 · audit.md 기록.

---

## 11. 미결 사항 (NFR Design에서 확정)

- VPC Interface Endpoints 세부 (SQS/Secrets/Logs/ECR) 포함 여부
- AWS Budgets 알람 포함 여부
- Terraform/Provider 정확한 버전 pinning
- Dockerfile 이미지 SHA pinning 정책
- OpenSearch Serverless 기동/정지 운영 절차
