# Unit 5 (Infrastructure) — Infrastructure Design Plan

## Stage Metadata
- **Stage**: CONSTRUCTION › Infrastructure Design (per-unit)
- **Unit**: Unit 5 (Infrastructure)
- **Track**: Fast-track
- **Input**: `nfr-requirements/` + `nfr-design/` (논리적 컴포넌트 16개 모듈, 패턴 10개)

## Output Artifacts (Step 6에서 생성 예정)
- `aidlc-docs/construction/unit-5-infrastructure/infrastructure-design/infrastructure-design.md`
- `aidlc-docs/construction/unit-5-infrastructure/infrastructure-design/deployment-architecture.md`

---

## Execution Plan (Checkbox)

- [x] Step 1: NFR Design 산출물 분석 (nfr-design-patterns.md + logical-components.md)
- [x] Step 2: Infrastructure Design Plan 생성 (이 파일)
- [x] Step 3: Context-appropriate 질문 생성 (아래)
- [x] Step 4: Plan 저장 완료
- [ ] Step 5: 답변 수집 + 모호성 검증
- [ ] Step 6: `infrastructure-design.md` + `deployment-architecture.md` 생성
- [ ] Step 7: Completion 메시지 제시
- [ ] Step 8: 사용자 승인 대기
- [ ] Step 9: 승인 기록 + aidlc-state.md 업데이트

---

## 분석 요약

NFR Design에서 이미 확정된 사항:
- 16개 Terraform 모듈 구조 및 의존성 그래프
- VPC CIDR, 서브넷, NAT, S3 Gateway Endpoint
- RDS/ECS/ALB/SQS/SES/OpenSearch/Bedrock KB 전체 서비스 선택
- IAM Role 5개, S3 버킷 6개, SQS 큐 12개, CloudWatch 알람 15개
- CI/CD 파이프라인 2개 (Manual Release + Manual Approval)
- Cross-Region (us-east-1) 구성

**남은 결정 사항**: 실제 배포에 필요한 구체적 설정값 (도메인, ECS 사이징, 네이밍 컨벤션 등)

---

## 질문지

각 질문의 `[Answer]:` 태그 뒤에 알파벳 하나를 기입해주세요. 완료되면 "완료" 또는 "done"으로 알려주세요.

---

### Question 1 — 도메인명

Route 53 호스팅 영역 + ACM 인증서에 사용할 도메인은 무엇인가요?

A) 이미 보유한 도메인이 있음 — 도메인명을 [Answer]: 뒤에 기재해주세요
B) 아직 도메인 미보유 — 추후 구매 예정 · Terraform에서는 변수로 처리 (`var.domain_name`)
C) dev 환경에서는 도메인 없이 ALB DNS 직접 사용 · 도메인은 prod 전환 시 설정
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A, ai-dlc.innoplecloud.net
---

### Question 2 — ECS Task 사이징 (dev)

dev 환경 ECS Task의 CPU/Memory를 어떻게 할까요? (Next.js 풀스택 앱 기준)

A) 0.25 vCPU / 0.5 GB — 최소 (개발 초기 · 트래픽 거의 없음)
B) 0.5 vCPU / 1 GB — 표준 개발 (Next.js SSR + API Routes 동시 처리)
C) 1 vCPU / 2 GB — 여유 (SQS worker도 동일 컨테이너에서 실행 시)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
C, 여유있게 가자 8일정도 유지라면 비용부담도 크게 없을 것 같아
---

### Question 3 — 리소스 네이밍 컨벤션

AWS 리소스 이름 패턴을 어떻게 할까요?

A) `helpdesk-ai-{resource}-{env}` (예: `helpdesk-ai-ecs-cluster-dev`, `helpdesk-ai-rds-dev`)
B) `{project}-{env}-{resource}` (예: `helpdesk-ai-dev-ecs-cluster`, `helpdesk-ai-dev-rds`)
C) `{env}-{project}-{resource}` (예: `dev-helpdesk-ai-ecs-cluster`)
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

### Question 4 — SES 인바운드 이메일 도메인

SES로 이메일을 수신하려면 수신 도메인이 필요합니다. 어떻게 할까요?

A) Q1에서 지정한 도메인의 서브도메인 사용 (예: `support@help.example.com`)
B) 별도 이메일 전용 도메인 사용 — 도메인명을 [Answer]: 뒤에 기재
C) dev에서는 SES 인바운드 미구성 — 웹 접수만 테스트 · 이메일은 prod 전환 시 설정
D) Other (please describe after [Answer]: tag below)

[Answer]: 
D, 질문이야.. 별도의 메일 도메인을 우리가 가지고 있어야 하나?
---

### Question 5 — Bedrock 모델 접근 권한

Bedrock 모델은 AWS 콘솔에서 수동으로 "모델 접근 요청"을 해야 사용 가능합니다. 어떤 모델을 활성화할까요?

A) Claude 3.5 Sonnet + Claude 3 Haiku + Titan Embeddings v2 (답변 생성 + 경량 + 임베딩)
B) Claude 3.5 Sonnet + Titan Embeddings v2만 (최소)
C) 모델 선택은 Unit 3(AI/RAG) 담당자가 결정 — Terraform에서는 IAM 정책만 `bedrock:InvokeModel` 와일드카드로 열어둠
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

## 응답 후 다음 단계
1. 답변 확정 → `infrastructure-design.md` + `deployment-architecture.md` 생성
2. Completion 메시지 + 승인 대기
3. 다음 단계: **Code Generation**
