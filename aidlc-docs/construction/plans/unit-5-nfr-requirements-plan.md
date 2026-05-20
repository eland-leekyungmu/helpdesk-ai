# Unit 5 (Infrastructure) — NFR Requirements Plan

## Stage Metadata
- **Stage**: CONSTRUCTION › NFR Requirements (per-unit)
- **Unit**: Unit 5 (Infrastructure)
- **Track**: Fast-track (Q1=B in entry questions) — Functional Design skip (인프라 유닛 · 비즈니스 로직 없음)
- **Depth**: Comprehensive (SECURITY-01~15 전체 적용, 24/7 가용성, 5000명 동시 사용자)

## Confirmed Entry Decisions
- Q2: dev 환경만 완전 구축 (staging/prod placeholder)
- Clarification 1.1: Terraform Backend **A** — S3 + DynamoDB lock + Bootstrap 모듈
- Clarification 1.2: CI/CD **A** — AWS CodePipeline + CodeBuild (CodeCommit 소스)
- Clarification 2: Bedrock KB 벡터 스토어 **A** — OpenSearch Serverless
- Clarification 3 v2: docker-compose.yml **A** — 유지 (Unit 5 담당자는 로컬 PG 사용)
- Q4: 단일 AWS 계정 · ap-northeast-2 · 신규 VPC
- Q7: 기존 `helpdesk-ai/` 골격 유지

## Input Artifacts (참조)
- `aidlc-docs/inception/requirements/requirements.md` (NFR-01~07, FR-11 인증)
- `aidlc-docs/inception/application-design/components.md` (8 컴포넌트)
- `aidlc-docs/inception/application-design/services.md` (8 서비스 · SQS 6 큐 이벤트)
- `aidlc-docs/inception/application-design/database-design.md` (11 테이블)
- `aidlc-docs/inception/application-design/unit-of-work.md` (Unit 5 책임 범위)
- `.kiro/aws-aidlc-rule-details/extensions/security/baseline/security-baseline.md` (SECURITY-01~15)

## Output Artifacts (Step 6에서 생성 예정)
- `aidlc-docs/construction/unit-5-infrastructure/nfr-requirements/nfr-requirements.md`
- `aidlc-docs/construction/unit-5-infrastructure/nfr-requirements/tech-stack-decisions.md`

## Unit 5 NFR 범위
이 유닛이 **다른 유닛의 NFR을 실현하는 인프라 제공자**이므로, 다음 NFR 카테고리가 직접 책임 범위:

| 카테고리 | Unit 5 책임 범위 |
|---|---|
| Scalability | ECS 태스크 Auto Scaling, RDS 인스턴스 크기, SQS 처리량 |
| Performance | RDS IOPS/스토리지, NAT Gateway 대역, CloudFront(선택) |
| Availability | Multi-AZ, 백업/복구, RDS failover, RTO/RPO |
| Security | KMS 키 관리, IAM 정책, VPC/Security Group, Secrets Manager, WAF(선택) |
| Reliability | CloudWatch 알람, Health check, Circuit breaker(ALB) |
| Maintainability | 태깅 표준, 로그 보존, IaC 모듈 구조 |
| Cost | RDS 인스턴스 등급, ECS Fargate Spot 활용 여부, OpenSearch Serverless OCU |
| Usability | N/A (인프라 유닛 · end-user UI 없음) |

---

## Execution Plan (Checkbox)

- [x] Step 1: Functional Design 읽기 — **Skip** (Fast-track, Unit 5는 인프라 유닛)
- [x] Step 2: NFR Requirements Plan 생성 (이 파일)
- [x] Step 3: Context-appropriate 질문 생성 (아래 질문지)
- [x] Step 4: Plan 저장 완료
- [ ] Step 5: 답변 수집 + 모호성 검증 + (필요 시) clarification 질문 생성
- [ ] Step 6: `nfr-requirements.md` + `tech-stack-decisions.md` 생성
- [ ] Step 7: Completion 메시지 제시
- [ ] Step 8: 사용자 승인 대기
- [ ] Step 9: 승인 기록 + aidlc-state.md 업데이트

---

## 질문지 (답변 방법)
각 질문의 `[Answer]:` 태그 뒤에 알파벳 하나를 기입해주세요. 적합한 옵션이 없으면 마지막(Other)을 선택하고 설명을 덧붙여주세요. 완료되면 "완료" 또는 "done"으로 알려주세요.

**참고**: 이 단계는 *dev 환경*을 대상으로 하되, prod에서 어떻게 확장될지 전제를 함께 기록합니다. prod로 넘어갈 때 재확인 포인트로 사용됩니다.

---

### 🔷 A. Scalability (확장성)

#### Question A1
ECS Fargate 태스크 Auto Scaling 정책을 어떻게 할까요? (NFR-02: 5000명 동시 사용자)

A) dev 고정 1태스크 · prod 최소 2 · 최대 10 · CPU 70% 트리거
B) dev 고정 1태스크 · prod 최소 2 · 최대 20 · CPU+메모리 혼합 트리거
C) dev/prod 모두 최소 2 · prod 최대 10 · ALB RequestCountPerTarget 트리거 (트래픽 기반)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

#### Question A2
RDS PostgreSQL 초기 인스턴스 클래스를 어떻게 할까요?

A) dev: db.t4g.micro (최소 사양) · prod: db.m7g.large (운영 권장)
B) dev: db.t4g.small · prod: db.m7g.large
C) dev: db.t4g.medium · prod: db.m7g.xlarge (성능 여유)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
B
---

### 🔷 B. Performance (성능)

#### Question B1
RDS 스토리지 설정을 어떻게 할까요?

A) dev: 20GB gp3 · prod: 100GB gp3 · Auto Scaling 최대 500GB
B) dev: 20GB gp3 · prod: 200GB gp3 · Auto Scaling 최대 1TB
C) dev: 50GB gp3 · prod: 500GB io2 · IOPS 3000 (고성능)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

#### Question B2
SQS 큐 기본 설정을 어떻게 할까요? (6개 큐: email-inbound, email-outbound, llm-logging, feedback-accumulate, kb-reindex, assignment-events)

A) 표준 큐 6개 · Visibility timeout 30초 · DLQ 모두 구성 (3회 재시도 후 DLQ)
B) 표준 큐 6개 · Visibility timeout 60초 · DLQ 모두 구성 (5회 재시도 후 DLQ)
C) email-inbound/outbound는 FIFO(중복 방지) · 나머지 표준 · DLQ 모두 구성
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A, 그리고 SQS는 현재 어떤 기능에서 이용하게 되는지 설명 좀 부탁해
---

### 🔷 C. Availability (가용성) — NFR-01: 24/7 무중단

#### Question C1
RDS Multi-AZ 및 백업 전략을 어떻게 할까요?

A) dev: Single-AZ · 백업 7일 / prod: Multi-AZ · 백업 30일 · Point-in-Time Recovery
B) dev: Single-AZ · 백업 3일 / prod: Multi-AZ · 백업 14일 · PITR
C) dev/prod 모두 Multi-AZ · 백업 30일 · PITR (최대 가용성)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
B
---

#### Question C2
서비스 가용성 목표(RTO/RPO)를 어떻게 정할까요?

A) dev: RTO 24시간, RPO 24시간 / prod: RTO 1시간, RPO 15분 (MVP 표준)
B) dev: RTO 4시간, RPO 1시간 / prod: RTO 30분, RPO 5분 (엄격)
C) dev: best-effort (정의 안 함) / prod: RTO 1시간, RPO 15분
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

#### Question C3
ECS 배포 전략을 어떻게 할까요?

A) Rolling update · minimum healthy 100% · maximum 200% (무중단)
B) Blue/Green · CodeDeploy 통합 (Canary 10% 5분 후 100%)
C) Rolling update (dev) / Blue/Green (prod)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### 🔷 D. Security (보안) — SECURITY-01~15 전체 적용

#### Question D1 (SECURITY-01)
KMS 키 관리 전략을 어떻게 할까요?

A) AWS 관리형 키(aws/rds, aws/s3 등) 사용 — 관리 부담 최소
B) 서비스별 **고객 관리형 CMK** 분리 (RDS, S3, SQS, Secrets, Logs 각각) — 표준 권장
C) 단일 CMK 1개를 전 서비스 공유 사용 — 관리 단순, 키 순환 일괄
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

#### Question D2 (SECURITY-06, SECURITY-07)
VPC 서브넷 구조를 어떻게 할까요?

A) 2-AZ · Public/Private 각 2개 · NAT Gateway 2개(AZ별) — 표준 HA
B) 2-AZ · Public/Private 각 2개 · NAT Gateway 1개 — 비용 절감 (dev 기준)
C) 3-AZ · Public/Private 각 3개 · NAT Gateway 3개 — 최대 가용성
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

#### Question D3 (SECURITY-12)
애플리케이션 시크릿(DB password, JWT secret, Bedrock API 등) 관리는 어떻게 할까요?

A) AWS Secrets Manager — 자동 rotation 지원 · ECS Task Definition에서 secret 참조
B) AWS Systems Manager Parameter Store (SecureString) — 저비용 · 수동 rotation
C) Secrets Manager(DB 자격증명만) + SSM Parameter Store(기타) — 혼용
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

#### Question D4 (SECURITY-02, SECURITY-11)
ALB 및 WAF 설정을 어떻게 할까요?

A) ALB + HTTPS(ACM 인증서) + 액세스 로그(S3) · WAF 없음 (MVP)
B) ALB + HTTPS + 액세스 로그 · **WAF 기본 규칙 세트**(AWS Managed Rules: Core rule set, Known bad inputs, Rate limit)
C) A로 시작, prod 전환 시 WAF 추가 (점진 도입)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

#### Question D5 (SECURITY-08)
외부 진입 도메인과 TLS는 어떻게 할까요?

A) Route 53 호스팅 영역 + ACM 인증서 + ALB (사용자가 도메인 제공)
B) dev는 ALB DNS 직접 사용 · prod만 도메인+ACM 구성
C) 도메인 준비 전제 없이 ALB 기본 DNS 사용, ACM은 추후
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

### 🔷 E. Reliability (신뢰성) — SECURITY-14

#### Question E1
CloudWatch 알람 범위를 어떻게 할까요?

A) **최소 세트**: ECS 태스크 Health, RDS CPU/Storage, ALB 5xx, SQS DLQ
B) **표준 세트**: A + Bedrock throttle, SES bounce rate, OpenSearch Serverless OCU, 인증 실패(CloudWatch Logs metric filter)
C) **포괄 세트**: B + 비용 알람, LLM 비용 일별 알람, VPC Flow Logs 이상 탐지
D) Other (please describe after [Answer]: tag below)

[Answer]: 
B
---

#### Question E2
CloudWatch Logs 보존 기간을 어떻게 할까요? (SECURITY-14: 최소 90일)

A) 애플리케이션 로그 90일 · ALB/VPC Flow 30일 · 감사/보안 이벤트 1년
B) 모든 로그 30일 (최소)
C) 애플리케이션 로그 180일 · 감사/보안 이벤트 2년 (엄격)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
B
---

### 🔷 F. Maintainability (유지보수성)

#### Question F1
AWS 리소스 태깅 표준을 어떻게 할까요?

A) 필수 태그 4종: `Project`, `Environment`, `Unit`, `ManagedBy`(= terraform)
B) 필수 태그 6종: A + `Owner`, `CostCenter`
C) 필수 태그 8종: B + `DataClassification`, `Compliance`
D) Other (please describe after [Answer]: tag below)

[Answer]: 
D, A안 + 'Service' (= AIDLC-ITHELP)
---

#### Question F2
Terraform 모듈 구조를 어떻게 할까요?

A) **환경 × 모듈** 구조 — `infra/environments/dev/main.tf`가 `infra/modules/*`를 참조 (표준)
B) **단일 루트** — `infra/*.tf`에 모두 인라인, 환경은 workspace로 분리 (간단)
C) **Terragrunt 래퍼** — DRY 극대화, 학습 곡선 있음
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

### 🔷 G. Tech Stack Selection

#### Question G1
Node.js 런타임 버전 및 컨테이너 베이스 이미지를 어떻게 할까요? (ECS 배포용 Dockerfile 기준)

A) `node:22-alpine` (최신 LTS · 경량)
B) `node:20-alpine` (안정 LTS · 가장 널리 검증)
C) `node:22-slim` (Debian slim · 네이티브 모듈 호환성 유리)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

#### Question G2
Bedrock 모델 호출 리전은 어떻게 처리할까요? (ap-northeast-2 Bedrock 모델 가용성 제한 있음)

A) 애플리케이션은 ap-northeast-2 배포 · Bedrock 호출만 **us-east-1** 또는 **us-west-2**로 크로스 리전 (VPC endpoint X, 인터넷 경유 TLS)
B) 애플리케이션은 ap-northeast-2 배포 · Bedrock 호출만 크로스 리전 + **PrivateLink for Bedrock** (비용 증가)
C) 리전 재검토 필요 — 전체를 us-east-1로 이전 고려
D) Other (please describe after [Answer]: tag below)

[Answer]: 

---

#### Question G3
OpenSearch Serverless Collection 사이징을 어떻게 할까요? (비용 주요 항목)

A) 최소 OCU — Indexing 2 / Search 2 (dev · 최소 비용) · prod도 동일하게 시작 후 모니터링
B) dev 최소(2/2) · prod Indexing 4 / Search 4 (트래픽 대응)
C) 결정 보류 — Infrastructure Design 단계에서 데이터 규모(10만건) 기반으로 재산정
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A로 하고 싶은데... 10만건 규모라면 C를 해야하나? 이 사항은 의견 부탁해
---

### 🔷 H. Cost (비용)

#### Question H1
ECS Fargate Spot 활용 여부를 어떻게 할까요?

A) dev: Fargate Spot 100% · prod: On-Demand 100% (표준)
B) dev: Fargate Spot 100% · prod: On-Demand 2 + Spot 최대 8 (혼합 확장)
C) dev/prod 모두 On-Demand (안정성 우선)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
C
---

#### Question H2
dev 환경의 업무 외 시간 비용 절감 정책을 두시겠어요?

A) EventBridge 스케줄 — 야간/주말 ECS desiredCount=0, RDS stop (일 8시간 가동) — 약 65% 절감
B) 24/7 가동 (비용 절감 안 함) — 단순
C) RDS만 야간 정지, ECS는 24/7
D) Other (please describe after [Answer]: tag below)

[Answer]: 
B
---

### 🔷 I. CI/CD 세부

#### Question I1
CodeCommit 브랜치 전략을 어떻게 할까요? (5명 병렬 · 머지 충돌 최소화 원칙)

A) Trunk-based: `main` 하나 · 피처 브랜치는 짧게(1~2일) · `main` push → dev 자동 배포
B) GitFlow: `main`(prod) + `develop`(dev) + `feature/unit-*` · `develop` push → dev 자동 배포
C) Unit별 long-lived 브랜치: `unit-1` ~ `unit-5` 브랜치 유지 · 주기적으로 `main`에 머지 · `main` push → dev 자동 배포
D) Other (please describe after [Answer]: tag below)

[Answer]: 
c인데 지금 main 외에는 /feat/unitX* 이런식으로 하고 있어, 그리고 머지는 유닛모두 개발 후 머지하게 될거야
---

#### Question I2
CodePipeline 파이프라인 구성 범위를 어떻게 할까요? (MVP = dev 환경만)

A) **1개 파이프라인** — 소스(CodeCommit) → Terraform Plan → Manual Approval → Terraform Apply → App Build(Docker) → ECR Push → ECS Deploy
B) **2개 파이프라인 분리** — (1) Infra 파이프라인 · (2) App 파이프라인 — 독립 변경·배포
C) **3개 파이프라인** — (1) Bootstrap · (2) Infra · (3) App — 완전 분리
D) Other (please describe after [Answer]: tag below)

[Answer]: 
B
---

#### Question I3
Terraform apply 승인 정책을 어떻게 할까요?

A) dev는 **자동 apply** · prod는 Manual Approval 필수
B) dev/prod 모두 Manual Approval 필수
C) dev/prod 모두 **자동 apply** (dev는 막 실험 허용)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
B
---

### 🔷 J. 컴플라이언스 및 운영

#### Question J1
기본 백업/스냅샷 외에 Disaster Recovery 전략을 별도로 둘까요?

A) 기본 RDS 자동 백업만 (MVP)
B) 기본 백업 + 주간 수동 스냅샷 + S3 크로스 리전 복제(KB 데이터)
C) 크로스 리전 DR (prod 전용, 별도 검토)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

#### Question J2
감사 로그(CloudTrail, VPC Flow Logs, Config) 활성화 범위를 어떻게 할까요?

A) CloudTrail(모든 리전, S3 저장, 로그 파일 검증) + VPC Flow Logs(REJECT만) + AWS Config 비활성
B) CloudTrail + VPC Flow Logs(ALL) + AWS Config(기본 규칙)
C) CloudTrail만 (최소)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
B
---

## 응답 후 다음 단계
1. 모든 `[Answer]:` 완료 여부 검증
2. 모호성/모순 체크 — 필요 시 `unit-5-nfr-requirements-clarification.md` 생성
3. `aidlc-docs/construction/unit-5-infrastructure/nfr-requirements/nfr-requirements.md` 및 `tech-stack-decisions.md` 생성
4. 완료 메시지 + 승인 대기
5. 다음 단계: **NFR Design**
