# Unit 5 (Infrastructure) — NFR Requirements Clarification

## 목적
NFR Requirements Plan 답변에서 다음 항목들을 해결합니다:
1. **B2** — SQS 기능 설명 요청
2. **G2** — 미답변 항목 재답변
3. **G3** — OpenSearch OCU 사이징 의견 요청 (10만건 규모 기준)
4. **I1** — `feat/unitX*` 브랜치 + "모두 완료 후 최종 머지" 전제 하에서 dev 자동 배포 트리거 확정

## 자동 정정 완료
- **C2 (RTO/RPO)**: `[Answer]: A` — 엑세스 태그 위치 정정 완료
- **C3 (ECS 배포)**: `[Answer]: A` — 엑세스 태그 위치 정정 완료

## 피드백 (참고 의견)
귀하의 답변 패턴을 보면 다음 일관된 철학이 있습니다:
- **MVP 최소주의**: D4(WAF 없음), J1(DR 최소), B1(스토리지 최소)
- **명시적 승인 선호**: I3(모든 환경 Manual Approval)
- **안정성 > 비용 절감**: H1(On-Demand), H2(24/7), C1(Multi-AZ prod)

이 방향성과 일관되게 남은 질문에 대한 AI 의견을 아래에 제시합니다.

---

## 🔎 Clarification 1 — B2 (SQS 기능 설명)

### 설명

이 프로젝트에서 SQS는 **비동기 이벤트 큐**로 사용되며, 총 **6개 큐**가 아키텍처에 정의되어 있습니다. `application-design/services.md`와 `unit-of-work-dependency.md` 기반으로 정리하면:

| 큐 이름 | Producer → Consumer | 용도 | 처리 시나리오 |
|---|---|---|---|
| **helpdesk-email-inbound** | SES/Lambda → Unit 2 | 인바운드 이메일 수신 | 이메일 도착 → S3 저장 → Lambda 트리거 → 큐에 메시지 → Unit 2의 worker/route가 pull하여 파싱·티켓 생성 |
| **helpdesk-email-outbound** | Unit 2 → SES | 아웃바운드 이메일 발송 | 답변 완료 이벤트 → 큐에 발송 요청 → worker가 pull하여 SES 호출 (Public만, Private 차단) |
| **helpdesk-llm-logging** | Unit 3 → Unit 4 | LLM 사용 로그 저장 | Bedrock 호출 완료 → 큐에 토큰/비용 메시지 → worker가 `llm_usage_logs` 테이블에 INSERT |
| **helpdesk-feedback-accumulate** | Unit 2 → Unit 4 | 티켓 완료 → KB 엔트리 변환 | 티켓 resolved 이벤트 → 큐 → worker가 메시지에서 Q/A 추출 → `knowledge_base_entries` INSERT |
| **helpdesk-kb-reindex** | Unit 4 → Unit 3 | KB 재색인 트리거 | 관리자 트리거 또는 주기 → 큐 → worker가 Bedrock KB ingestion job 시작 |
| **helpdesk-assignment-events** | Unit 2 → Unit 3 | 분배 이벤트 ("본인 아님" 재분배, Private→Public 변환) | 이벤트 → 큐 → worker가 AI 재판정 호출 |

### 왜 SQS를 쓰는가?
1. **응답 시간 단축** — 사용자 요청 스레드에서 LLM 호출/이메일 발송 같은 무거운 작업을 동기로 처리하지 않음 (NFR-03: 응답 5초 목표)
2. **장애 격리** — SES가 일시 장애여도 메시지가 큐에 남아 재시도
3. **부하 평탄화** — 이메일 대량 수신 시 워커 처리 속도로 처리
4. **DLQ(Dead Letter Queue)** — 3회 재시도 실패 시 DLQ로 이동, CloudWatch 알람 연동 (E1 표준 세트에 포함됨)

### Unit 5의 SQS 책임
- 6개 큐 + 6개 DLQ Terraform 리소스 생성
- KMS 암호화 (D1=A → AWS 관리형 키 `aws/sqs` 사용)
- IAM 정책: 각 유닛의 ECS Task Role에 필요한 큐만 `SendMessage` / `ReceiveMessage` 권한 부여 (SECURITY-06 최소 권한)
- CloudWatch 알람: DLQ `ApproximateNumberOfMessagesVisible > 0` 시 알람

**B2 답변 A 유지 (표준 큐, Visibility 30초, DLQ 3회 재시도)** — 적절한 선택입니다. 변경 없음.

---

## 🔎 Clarification 2 — G2 재답변 필요 (Bedrock 리전)

### 배경
ap-northeast-2(서울) Bedrock 모델 가용성은 제한적입니다. **2025년 기준**으로 서울 리전은 Claude 모델 일부만 가용하고, **Titan Embeddings v2** 및 **Nova 시리즈**는 us-east-1/us-west-2에 먼저 제공됩니다. 이 프로젝트의 KB 임베딩 모델(`amazon.titan-embed-text-v2:0`)과 라우팅/답변 생성용 Claude는 **대부분 us-east-1을 타겟**으로 하는 것이 안전합니다.

### AI 의견
D4=A(WAF 없음)와 H2=B(24/7) 등 MVP 최소주의를 선택하셨으므로, **PrivateLink for Bedrock**은 비용 증가(월 ~$75/엔드포인트) 대비 보안 이득이 MVP 단계에서 과잉입니다. **A 옵션(크로스 리전 인터넷 경유 TLS)**이 본 패턴에 적합합니다.

**참고**: Bedrock 호출은 HTTPS(TLS 1.2+)로 AWS 엔드포인트에 접속하므로 인터넷 구간에서도 암호화 보장됩니다. VPC 엔드포인트가 없어도 SECURITY-01(전송 암호화)은 만족합니다.

### Clarification Question G2
Bedrock 호출 리전은 어떻게 할까요?

A) 애플리케이션 ap-northeast-2 배포 · **Bedrock은 us-east-1 크로스 리전 호출** (NAT Gateway 경유 TLS) — MVP 권장
B) 애플리케이션 ap-northeast-2 배포 · Bedrock 크로스 리전 + **PrivateLink for Bedrock** — 비용 증가
C) 전체를 us-east-1로 이전 — 네트워크 단순화, 한국 사용자 레이턴시 증가
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A
---

## 🔎 Clarification 3 — G3 의견 요청 (OpenSearch OCU 사이징)

### 데이터 규모 분석

프로젝트 전제:
- 합성 데이터 **10만 건** (FR-13, 1년치) — 초기 KB 적재
- 각 엔트리: 질문 + 답변 (평균 500 tokens × 2 = 1KB 추정)
- 총 KB 데이터: **~100MB (raw)** → 임베딩 벡터(1536차원 float32 × 100K) = **~600MB (vector)**
- 예상 쿼리: 1차 AI 답변 70% (NFR-02: 5000명 기준 하루 ~1000건 예측) → **초당 0.1~1 QPS**

### OpenSearch Serverless OCU 정책

OpenSearch Serverless는 **OCU(OpenSearch Compute Unit)** 단위로 과금됩니다:
- **Indexing OCU**: 데이터 색인/업데이트
- **Search OCU**: 쿼리 처리
- **최소 각 2 OCU** (총 4 OCU) — 약 **$350~700/월 (dev 기준)**
- 1 OCU ≈ 6GB 벡터 용량, 2000 OPS (operations/sec)

### 판단
- **데이터 용량**: 600MB ≪ 6GB (1 OCU) → **최소 OCU로 충분**
- **쿼리 볼륨**: 1 QPS ≪ 2000 OPS → **여유 충분**
- **Indexing**: 10만 건 초기 적재는 몇 시간 배치 작업 · 이후 증분은 매우 낮음 → 최소 OCU 가능

### AI 의견
**A(최소 OCU) 유지가 합리적**입니다. 10만 건 규모는 1 OCU 용량 한계의 10% 수준이며, prod에서도 동일하게 시작 후 CloudWatch `SearchRate`/`IngestionRate` 모니터링으로 판단하는 것이 비용 효율적입니다.

**단, OpenSearch Serverless의 최소 OCU가 2 + 2 = 4개로 고정**이라 이 자체가 dev에서도 월 **$350+** 로 MVP 비용 부담이 큽니다. 만약 비용이 더 큰 우려라면 대안도 제시합니다:

### Clarification Question G3
OpenSearch Serverless OCU 사이징은 어떻게 할까요?

A) **최소 OCU (2+2)** 로 dev/prod 모두 시작 · 모니터링 기반 조정 — 권장
B) dev 최소(2+2) · prod Indexing 4 / Search 4 — prod 여유
C) **대안 재검토**: Bedrock KB를 Pinecone/pgvector로 변경 (Q5 Clarification 2 재오픈) — 비용 크게 절감 가능하지만 Bedrock KB 내장 연동 포기
D) Other (please describe after [Answer]: tag below)

[Answer]: 
A, 근데 지금 prod는 구성에 대한 질문만 하고 실제로 이번에 구성 자체는 안하는게 맞지?
오픈서치 비용이 생각보다 높네... 8일만 유지해도 100달러 가까이 나오겠어...
---

## 🔎 Clarification 4 — I1 브랜치 전략 + 배포 트리거 확정

### 상황 정리
- 현재 브랜치 상태: `main` + `feat/unit1*`, `feat/unit2*`, ... (각 유닛별 피처 브랜치)
- 머지 시점: **모든 유닛 개발 완료 후 최종 통합 머지**
- CodePipeline 2개 분리 (I2=B): Infra 파이프라인 + App 파이프라인

### 논점
선택하신 C(Unit별 long-lived 브랜치) + 설명("feat/unitX*", "전체 완료 후 머지")을 조합하면, **dev 환경 CI/CD 트리거를 어디에 거는가**가 모호해집니다.

#### 옵션 1: `feat/unit5*` 브랜치를 dev 파이프라인 트리거로 사용
- Unit 5 담당자(본인)가 push할 때마다 dev 환경 자동 배포
- **문제**: 다른 유닛 담당자는 자기 브랜치가 dev에 배포되지 않음 → dev 환경이 "Unit 5 전용"처럼 되어 불공평
- 다른 유닛이 자신의 dev 테스트를 하려면 어디에 배포해야 하나?

#### 옵션 2: `main`을 dev 파이프라인 트리거로 사용 (최종 머지 후)
- **문제**: 최종 통합 머지까지는 dev 환경 배포가 없음 → 개발 중 인프라 검증 불가
- Unit 5 Terraform 변경을 실서버에 적용해 보려면 어떻게?

#### 옵션 3: `dev` 브랜치 도입 — 통합 테스트용 중간 브랜치
- 각 유닛은 자기 피처 브랜치에서 개발
- 배포 테스트 필요 시 `dev`로 머지 push → 자동 배포
- 최종 안정화되면 `main`으로 머지
- **장점**: 각자 독립 개발 + 공유 dev 환경
- **단점**: 중간 브랜치 1개 추가

#### 옵션 4: **유닛별 피처 브랜치는 각자 로컬에서 검증**, Unit 5의 **Terraform만 `feat/unit5*` push 시 infra 파이프라인 자동 실행**, 앱 코드는 머지 전까지 dev 배포 안 함
- Unit 5 특성상 먼저 인프라 올려야 다른 유닛이 개발 가능 → Unit 5만 별도 취급
- App 파이프라인은 통합 머지 후 동작 시작

### AI 의견
현재 프로젝트는 **Unit 5가 Critical Path 최전선**이므로 **옵션 4**가 실용적입니다:
- Unit 5 인프라는 먼저 dev에 배포되어야 Unit 1~4가 개발 가능
- 다른 유닛은 로컬(docker-compose PG + AWS dev 리소스 직접 접근)에서 개발
- 통합 시점에 `main`으로 모두 머지 → App 파이프라인 발동

### Clarification Question I1
dev 환경 배포 트리거를 어떻게 구성할까요?

A) **옵션 4 (하이브리드)**: Infra 파이프라인은 `feat/unit5*` push 시 발동 · App 파이프라인은 `main` push 시 발동 (통합 머지 후 시작)
B) **옵션 3 (dev 브랜치)**: `dev` 통합 브랜치 신설 · 각자 피처 브랜치에서 `dev`로 머지 push 시 파이프라인 발동
C) **옵션 1**: `feat/unit5*` 하나만을 기준으로 Infra/App 모두 배포 — 단순하지만 타 유닛 불리
D) 지금은 **Manual Start만 구성**, 자동 트리거 없음 — 필요 시 CodeCommit에서 수동 실행 (완전 수동)
E) Other (please describe after [Answer]: tag below)

[Answer]: 
D, 매뉴얼 배포 근데 코드 파이프라인으로 배포되는거 아냐? 수동 릴리즈 버튼이 있을텐데?
---

## 응답 후 다음 단계
4개 질문(G2, G3, I1, 그리고 B2 확인) 답변 후:
1. 모든 답변 확정 → `nfr-requirements.md` 및 `tech-stack-decisions.md` 생성
2. Completion 메시지 제시 + 사용자 승인
3. 다음 단계: **NFR Design**

### 확정된 NFR 결정 (요약)
20개 중 16개 확정 · 4개 clarification 대기 중. 전반적 방향성: **MVP 최소주의, dev 비용 허용, 안정성 > 비용 절감, 명시적 승인 선호**.
