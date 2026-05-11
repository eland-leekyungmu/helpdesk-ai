# Unit of Work - Dependency Matrix

## 의존성 매트릭스

| 의존하는 유닛 ↓ / 의존 대상 → | Unit 1 (Frontend) | Unit 2 (Intake) | Unit 3 (AI/RAG) | Unit 4 (Admin) | Unit 5 (Infra) |
|---|---|---|---|---|---|
| **Unit 1 (Frontend)** | - | API 호출 | - | API 호출 | - |
| **Unit 2 (Intake & Routing)** | - | - | 서비스 호출 | 사용자 조회 | 인프라 |
| **Unit 3 (AI/RAG)** | - | - | - | - | 인프라 |
| **Unit 4 (Admin & Analytics)** | - | 티켓 데이터 조회 | LLM 로그 조회 | - | 인프라 |
| **Unit 5 (Infrastructure)** | - | - | - | - | - |

---

## 의존성 상세

### Unit 1 → Unit 2, Unit 4
- **유형**: HTTP API 호출 (Next.js API Routes)
- **인터페이스**: REST API (공유 타입 기반 요청/응답)
- **결합도**: 낮음 (API 계약만 준수)

### Unit 2 → Unit 3
- **유형**: 서비스 레이어 직접 호출 (동일 프로세스 내)
- **인터페이스**: `AIService.generateAnswer()`, `AIService.determineRouting()`, `AIService.transformToPublic()`
- **결합도**: 중간 (서비스 인터페이스 준수)

### Unit 2 → Unit 4
- **유형**: Repository 레이어 조회 (사용자 정보)
- **인터페이스**: `UserRepository.findById()`, `UserRepository.findByTeam()`
- **결합도**: 낮음 (읽기 전용)

### Unit 4 → Unit 2, Unit 3
- **유형**: Repository 레이어 조회 (통계 집계용)
- **인터페이스**: 티켓/메시지/LLM 로그 테이블 읽기
- **결합도**: 낮음 (읽기 전용, 집계 쿼리)

### Unit 2, 3, 4 → Unit 5
- **유형**: 인프라 의존 (RDS, SQS, SES, Bedrock)
- **인터페이스**: 환경 변수, 연결 문자열
- **결합도**: 낮음 (인프라 추상화)

---

## 이벤트 기반 비동기 의존성 (SQS)

| Producer | Consumer | 이벤트 | 큐 |
|---|---|---|---|
| Unit 2 | Unit 3 | 2차 Private 답변 → Public 변환 | helpdesk-assignment-events |
| Unit 2 | Unit 3 | "본인 아님" → 재분배 판정 | helpdesk-assignment-events |
| Unit 3 | Unit 4 | LLM 사용 로그 저장 | helpdesk-llm-logging |
| Unit 2 | Unit 4 | 티켓 완료 → 학습 데이터 누적 | helpdesk-feedback-accumulate |
| Unit 4 | Unit 3 | KB 재색인 트리거 | helpdesk-kb-reindex |
| SES/Lambda | Unit 2 | 인바운드 이메일 수신 | helpdesk-email-inbound |
| Unit 2 | SES | 아웃바운드 이메일 발송 | helpdesk-email-outbound |

---

## 개발 순서 (권장)

```
Phase 1: 기반 구축 (병렬 가능)
  ├── Unit 5: 인프라 (Terraform, RDS, SQS, SES)
  ├── Unit 4: 인증 + 사용자/조직 관리
  └── shared/ 타입 정의

Phase 2: 핵심 비즈니스 (Phase 1 완료 후)
  ├── Unit 2: 티켓/메시지/분배 API
  └── Unit 3: AI/RAG 서비스

Phase 3: 프론트엔드 (Phase 2 완료 후)
  └── Unit 1: 전체 UI

Phase 4: 통합 (모든 유닛 완료 후)
  └── Build & Test
```

---

## Critical Path

```
Unit 5 (Infra) → Unit 4 (Auth) → Unit 2 (Ticket) → Unit 3 (AI) → Unit 1 (Frontend)
```

- Unit 5가 가장 먼저 완료되어야 다른 유닛이 인프라 위에서 동작 가능
- Unit 4의 인증이 있어야 API 보호 가능
- Unit 2의 티켓 API가 있어야 Unit 3이 답변 생성 연동 가능
- Unit 1은 모든 API가 준비된 후 UI 연동
