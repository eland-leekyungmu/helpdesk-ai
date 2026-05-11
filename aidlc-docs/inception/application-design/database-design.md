# Database Design (ERD 초안)

## ERD 개요

```
+------------------+       +------------------+       +------------------+
| organizations    |<--+   |   departments    |<--+   |     teams        |
+------------------+   |   +------------------+   |   +------------------+
| id (PK)          |   |   | id (PK)          |   |   | id (PK)          |
| name             |   |   | organization_id  |   |   | department_id    |
| code             |   |   | name             |   |   | name             |
+------------------+   |   | code             |   |   | code             |
                       |   +------------------+   |   +------------------+
                       |                          |            |
                       |                          |            v
                       |                          |   +------------------+
                       |                          +---+      users       |
                       |                              +------------------+
                       |                              | id (PK)          |
                       |                              | email            |
                       |                              | team_id (FK)     |
                       |                              | role             |
                       +------------------------------+------------------+
                                                               |
                    +------------------------------------------+
                    |                    |
                    v                    v
+------------------+       +------------------+       +------------------+
|     tickets      |       |    messages      |       | ticket_assignments|
+------------------+       +------------------+       +------------------+
| id (PK)          |<---+  | id (PK)          |       | id (PK)          |
| ticket_number    |    |  | ticket_id (FK)   |       | ticket_id (FK)   |
| requester_id(FK) |    |  | sender_id (FK)   |       | assigned_to (FK) |
| assigned_to(FK)  |    |  | visibility       |       | assignment_type  |
| status           |    +--| content          |       | status           |
| category         |       +------------------+       +------------------+
+------------------+

+------------------+       +------------------+       +------------------+
|   llm_usage_logs |       |    feedbacks      |       | email_threads    |
+------------------+       +------------------+       +------------------+
| id (PK)          |       | id (PK)          |       | id (PK)          |
| ticket_id (FK)   |       | message_id (FK)  |       | ticket_id (FK)   |
| model_name       |       | user_id (FK)     |       | message_id_header|
| cost_usd         |       | rating           |       | from_email       |
+------------------+       +------------------+       +------------------+

+------------------+
| knowledge_base   |
|   _entries       |
+------------------+
| id (PK)          |
| question         |
| answer           |
| category         |
| is_synthetic     |
+------------------+
```

---

## 테이블 상세 정의

### 1. organizations (법인)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 법인 고유 ID |
| name | VARCHAR(100) | 법인명 |
| code | VARCHAR(20) UNIQUE | 법인 코드 |
| is_active | BOOLEAN | 활성 상태 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

**소유 유닛**: Unit 4 (Admin & Analytics)

### 2. departments (부서)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 부서 고유 ID |
| organization_id | UUID (FK → organizations) | 소속 법인 |
| name | VARCHAR(100) | 부서명 |
| code | VARCHAR(20) | 부서 코드 |
| is_active | BOOLEAN | 활성 상태 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

**소유 유닛**: Unit 4 (Admin & Analytics)

### 3. teams (팀)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 팀 고유 ID |
| department_id | UUID (FK → departments) | 소속 부서 |
| name | VARCHAR(100) | 팀명 |
| code | VARCHAR(20) | 팀 코드 |
| is_active | BOOLEAN | 활성 상태 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

**소유 유닛**: Unit 4 (Admin & Analytics)

### 4. users (사용자)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 사용자 고유 ID |
| email | VARCHAR(255) UNIQUE | 이메일 (로그인 ID) |
| password_hash | VARCHAR(255) | bcrypt 해시 |
| name | VARCHAR(100) | 이름 |
| role | ENUM | employee / agent_l1 / agent_l2 / admin |
| team_id | UUID (FK → teams) | 소속 팀 (팀→부서→법인 자동 결정) |
| is_active | BOOLEAN | 활성 상태 |
| login_attempts | INTEGER | 로그인 실패 횟수 |
| locked_until | TIMESTAMP | 잠금 해제 시간 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

**소유 유닛**: Unit 4 (Admin & Analytics)

**조직 계층 조회**: `users.team_id → teams.department_id → departments.organization_id`로 법인/부서/팀 모두 조회 가능

### 5. tickets (티켓)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 티켓 고유 ID |
| ticket_number | VARCHAR(20) UNIQUE | 티켓 번호 (표시용) |
| subject | VARCHAR(500) | 문의 제목/요약 |
| status | ENUM | open / in_progress / resolved / closed |
| priority | ENUM | low / medium / high |
| category | JSONB | AI 추천 카테고리 (문자열 배열, 최대 10개) |
| requester_id | UUID (FK → users) | 요청자 |
| assigned_to | UUID (FK → users) | 현재 담당자 |
| created_via | ENUM | web / email |
| confidence_score | DECIMAL(5,4) | AI 신뢰도 점수 |
| resolution_type | ENUM | ai_auto / agent_l1 / agent_l2 |
| created_at | TIMESTAMP | 접수일 |
| updated_at | TIMESTAMP | 수정일 |
| resolved_at | TIMESTAMP | 해결일 |

**소유 유닛**: Unit 2 (Intake & Routing)

### 6. messages (메시지)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 메시지 고유 ID |
| ticket_id | UUID (FK → tickets) | 소속 티켓 |
| sender_id | UUID (FK → users, nullable) | 발신자 (AI인 경우 null) |
| sender_type | ENUM | user / agent_l1 / agent_l2 / ai / system |
| visibility | ENUM | **public / private** |
| content | TEXT | 메시지 내용 |
| content_type | ENUM | text / html |
| attachments | JSONB | 첨부파일 메타데이터 |
| source | ENUM | web / email / ai_generated |
| ai_original_id | UUID (FK → messages, nullable) | AI 가공 원본 Private 메시지 참조 |
| created_at | TIMESTAMP | 생성일 |

**소유 유닛**: Unit 2 (Intake & Routing)

### 7. ticket_assignments (분배 이력)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 이력 ID |
| ticket_id | UUID (FK → tickets) | 대상 티켓 |
| assigned_to | UUID (FK → users) | 배정 대상 |
| assigned_by | UUID (FK → users, nullable) | 배정자 (AI인 경우 null) |
| assignment_type | ENUM | ai_auto / manual / reassign |
| status | ENUM | active / rejected / completed |
| rejected_reason | TEXT | "본인 아님" 사유 (선택) |
| suggested_user_id | UUID (FK → users, nullable) | 추천 담당자 (선택) |
| created_at | TIMESTAMP | 배정일 |

**소유 유닛**: Unit 2 (Intake & Routing)

### 8. email_threads (이메일 스레드)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 스레드 ID |
| ticket_id | UUID (FK → tickets) | 연결된 티켓 |
| message_id_header | VARCHAR(500) | Email Message-ID 헤더 |
| in_reply_to | VARCHAR(500) | In-Reply-To 헤더 |
| references | TEXT | References 헤더 |
| from_email | VARCHAR(255) | 발신자 이메일 |
| subject | VARCHAR(500) | 이메일 제목 |
| created_at | TIMESTAMP | 수신일 |

**소유 유닛**: Unit 2 (Intake & Routing)

### 9. llm_usage_logs (LLM 사용 로그)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 로그 ID |
| ticket_id | UUID (FK → tickets, nullable) | 관련 티켓 |
| model_name | VARCHAR(100) | 모델명 (claude-haiku, claude-sonnet 등) |
| model_type | ENUM | lightweight / heavy |
| input_tokens | INTEGER | 입력 토큰 수 |
| output_tokens | INTEGER | 출력 토큰 수 |
| cost_usd | DECIMAL(10,6) | 비용 (USD) |
| request_type | ENUM | answer_gen / routing / category / synthesis / public_transform |
| duration_ms | INTEGER | 응답 시간 (ms) |
| created_at | TIMESTAMP | 호출 시간 |

**소유 유닛**: Unit 3 (AI/RAG)

### 10. feedbacks (피드백)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 피드백 ID |
| message_id | UUID (FK → messages) | 대상 메시지 |
| user_id | UUID (FK → users) | 피드백 제공자 |
| rating | ENUM | positive / negative |
| created_at | TIMESTAMP | 피드백 시간 |

**소유 유닛**: Unit 4 (Admin & Analytics)

### 11. knowledge_base_entries (KB 엔트리)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID (PK) | 엔트리 ID |
| source_type | ENUM | real_data / synthetic / feedback |
| question | TEXT | 질문 |
| answer | TEXT | 답변 |
| category | VARCHAR(100) | 카테고리 |
| is_synthetic | BOOLEAN | 합성 데이터 여부 |
| quality_score | DECIMAL(3,2) | 품질 점수 |
| source_ticket_id | UUID (FK → tickets, nullable) | 원본 티켓 |
| created_at | TIMESTAMP | 생성일 |
| indexed_at | TIMESTAMP | KB 색인일 |

**소유 유닛**: Unit 3 (AI/RAG)

---

## 조직 계층 구조

```
법인 (organizations)
  └── 부서 (departments)
       └── 팀 (teams)
            └── 사용자 (users)
```

- 모든 사용자(요청자, 2차 처리자 포함)는 반드시 하나의 **팀**에 소속
- 팀 → 부서 → 법인으로 상위 조직이 자동 결정됨
- 통계/대시보드에서 법인별, 부서별, 팀별 집계 가능
- 2차 처리자 분배 시 조직 정보를 참고하여 적절한 담당자 매칭 가능

---

## 유닛별 테이블 소유권

| Unit | 소유 테이블 | 참조만 하는 테이블 |
|---|---|---|
| Unit 2 (Intake & Routing) | tickets, messages, ticket_assignments, email_threads | users, teams, departments, organizations |
| Unit 3 (AI/RAG) | llm_usage_logs, knowledge_base_entries | tickets, messages |
| Unit 4 (Admin & Analytics) | organizations, departments, teams, users, feedbacks | tickets, messages, llm_usage_logs |

**규칙**: 소유 유닛만 해당 테이블에 대한 마이그레이션/스키마 변경 권한을 가짐. 다른 유닛은 읽기 또는 FK 참조만 가능.

---

## 인덱스 전략

| 테이블 | 인덱스 | 용도 |
|---|---|---|
| organizations | code (UNIQUE) | 법인 코드 조회 |
| departments | organization_id, is_active | 법인별 부서 목록 |
| teams | department_id, is_active | 부서별 팀 목록 |
| users | email (UNIQUE) | 로그인 조회 |
| users | team_id, role, is_active | 팀별/역할별 사용자 목록 |
| tickets | requester_id, status | 임직원 본인 티켓 조회 |
| tickets | assigned_to, status | 처리자 담당 건 조회 |
| tickets | status, created_at | 대시보드 통계 |
| messages | ticket_id, visibility | 티켓별 메시지 조회 (Public 필터) |
| messages | ticket_id, created_at | 시간순 정렬 |
| ticket_assignments | ticket_id, status | 분배 이력 조회 |
| ticket_assignments | assigned_to, status | 담당자별 활성 건 |
| email_threads | message_id_header | 이메일 스레드 매칭 |
| email_threads | ticket_id | 티켓별 이메일 이력 |
| llm_usage_logs | created_at, model_name | 비용 통계 집계 |
| feedbacks | message_id | 메시지별 피드백 조회 |
