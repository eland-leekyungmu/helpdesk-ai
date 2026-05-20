# 테스트 실행 결과

**실행일시**: 2026-05-20T14:10:00+09:00  
**실행환경**: 로컬 개발 서버 (http://localhost:3000)  
**DB**: AWS RDS PostgreSQL (us-east-1)  
**AI/RAG**: AWS Bedrock (Claude Sonnet 4) + Knowledge Base  

---

## 1. 단위 테스트 (Unit Test)

**실행 명령**: `npm test`  
**프레임워크**: Vitest 4.1.6

| 항목 | 결과 |
|------|------|
| 테스트 파일 | 4 passed, 1 skipped |
| 테스트 케이스 | 19 passed, 7 skipped |
| 실행 시간 | 357ms |
| **상태** | ✅ **PASS** |

### 테스트 파일 상세
| 파일 | 상태 |
|------|------|
| tests/unit/services/ai.service.test.ts | ✅ PASS |
| tests/unit/services/data-pipeline.service.test.ts | ✅ PASS |
| tests/unit/repositories/knowledge-base.repository.test.ts | ✅ PASS |
| tests/unit/repositories/llm-usage.repository.test.ts | ✅ PASS |
| tests/integration/ai-service.integration.test.ts | ⏭️ SKIP (INTEGRATION=true 미설정) |

---

## 2. API 레벨 E2E 테스트

### SC-01: 인증 플로우

| # | 테스트 | 결과 | 응답 |
|---|--------|------|------|
| 1 | admin 로그인 (choi@company.com) | ✅ PASS | JWT 발급, role: admin |
| 2 | employee 로그인 (kim@company.com) | ✅ PASS | JWT 발급, role: employee |
| 3 | agent_l1 로그인 (park@company.com) | ✅ PASS | JWT 발급, role: agent_l1 |
| 4 | agent_l2 로그인 (lee@company.com) | ✅ PASS | JWT 발급, role: agent_l2 |
| 5 | 잘못된 비밀번호 | ✅ PASS | 401 "이메일과 비밀번호를 입력하세요." |
| 6 | 빈 입력 | ✅ PASS | 400 "이메일과 비밀번호를 입력하세요." |

---

### SC-02: 직원 티켓 생성 → AI 자동 응답

| # | 테스트 | 결과 | 상세 |
|---|--------|------|------|
| 1 | 티켓 생성 (VPN 접속 오류) | ✅ PASS | TK-2026-1595 생성 |
| 2 | AI 의도 분석 | ✅ PASS | 카테고리: 클라우드 인프라, 네트워크 |
| 3 | RAG 검색 | ✅ PASS | 5개 소스 참조 (유사도 0.52~0.56) |
| 4 | 신뢰도 산출 | ✅ PASS | confidence: 0.527 (≥ 0.5 임계값) |
| 5 | AI 자동 답변 생성 | ✅ PASS | VPN 해결 단계별 안내 (4단계) |
| 6 | 티켓 상태 변경 | ✅ PASS | status: resolved (ai_auto) |

**AI 응답 시간**: ~10초 (의도 분석 + RAG 검색 + 답변 생성)

---

### SC-04: 1차 처리자 수동 분배

| # | 테스트 | 결과 | 상세 |
|---|--------|------|------|
| 1 | 미처리 큐 조회 | ✅ PASS | 2건 표시, 대기시간 120h+ |
| 2 | 수동 분배 (agent_l1 → agent_l2) | ✅ PASS | assignmentType: manual, status: active |
| 3 | 이관 코멘트 저장 | ✅ PASS | "VPN 관련 문의입니다. 네트워크팀 확인 부탁드립니다." |

---

### SC-05: 2차 처리자 응답 (Private → Public 변환)

| # | 테스트 | 결과 | 상세 |
|---|--------|------|------|
| 1 | Private 메시지 작성 | ✅ PASS | visibility: private 강제 적용 |
| 2 | AI Public 변환 자동 생성 | ✅ PASS | 내부 용어 → 고객 친화적 문체 변환 |
| 3 | aiOriginalId 참조 | ✅ PASS | Public 메시지가 원본 Private 참조 |
| 4 | employee에게 private 숨김 | ✅ PASS | employee 조회 시 public 2건만 표시 |

**Private 원문**: "VPN 프로필 삭제 후 재생성하면 됨. 설정 > 네트워크 > VPN에서 기존 프로필 삭제하고 새로 추가하라고 안내"  
**AI Public 변환**: "고객님, 문의하신 VPN 연결 문제 해결을 위해 다음과 같은 방법을 안내드립니다. VPN 프로필을 삭제한 후 새로 생성하시면 문제가 해결될 것으로 보입니다..."

---

### SC-06: 분배 거절 + 재분배

| # | 테스트 | 결과 | 상세 |
|---|--------|------|------|
| 1 | 분배 거절 (사유 입력) | ✅ PASS | status: rejected |
| 2 | 재분배 시도 | ✅ PASS | 같은 팀 다른 agent 없음 → 1차 큐 에스컬레이션 |
| 3 | 티켓 상태 변경 | ✅ PASS | assignedTo: null, status: open |

---

### SC-07: 피드백 + 티켓 종료

| # | 테스트 | 결과 | 상세 |
|---|--------|------|------|
| 1 | 👍 피드백 제출 | ✅ PASS | rating: positive 저장 |
| 2 | 티켓 자동 closed | ✅ PASS | status: closed |
| 3 | KB 학습 데이터 적재 | ✅ PASS | KnowledgeBaseEntry 생성 |

---

### SC-08: 관리자 대시보드

| # | 테스트 | 결과 | 상세 |
|---|--------|------|------|
| 1 | KPI 통계 조회 | ✅ PASS | 해결률 25%, 분배 성공률 73%, 평균 처리 286분 |
| 2 | LLM 비용 통계 | ✅ PASS | 총 $1.154, Claude Sonnet 4 28회 호출 |
| 3 | 전체 티켓 조회 | ✅ PASS | 15건 표시 |

---

### SC-09: 관리자 사용자/조직 관리

| # | 테스트 | 결과 | 상세 |
|---|--------|------|------|
| 1 | 사용자 목록 조회 | ✅ PASS | 66명 (employee, agent_l1, agent_l2, admin) |

---

## 3. 보안 테스트

### SEC-01: 인증 우회 시도

| # | 테스트 | 결과 | 응답 |
|---|--------|------|------|
| 1 | Authorization 헤더 없이 호출 | ✅ 차단 | 401 "유효하지 않은 토큰입니다." |
| 2 | 잘못된 JWT로 호출 | ✅ 차단 | 401 "유효하지 않은 토큰입니다." |

### SEC-02: 역할 기반 접근 제어 (RBAC)

| # | 테스트 | 결과 | 응답 |
|---|--------|------|------|
| 1 | employee → /api/tickets/queue | ✅ 차단 | 403 "접근 권한이 없습니다." |
| 2 | employee → /api/admin/users | ✅ 차단 | 403 "접근 권한이 없습니다." |

---

## 4. 미실행 테스트 (수동 검증 필요)

| 시나리오 | 사유 |
|----------|------|
| SC-03: 첨부파일 포함 티켓 | S3 업로드 → 브라우저 UI 필요 |
| SC-10: KB 재색인 | 관리자 UI에서 트리거 필요 |
| SEC-03: 계정 잠금 (5회 실패) | 테스트 계정 잠금 방지 위해 미실행 |

---

## 5. 종합 결과

| 구분 | 전체 | 통과 | 실패 | 미실행 |
|------|------|------|------|--------|
| 단위 테스트 | 26 | 19 | 0 | 7 (skip) |
| E2E 시나리오 | 10 | 7 | 0 | 3 |
| 보안 테스트 | 5 | 4 | 0 | 1 |
| **합계** | **41** | **30** | **0** | **11** |

### 최종 판정: ✅ PASS

- 실행된 모든 테스트 통과 (실패 0건)
- 핵심 비즈니스 로직 정상 동작 확인
- AI/RAG 파이프라인 정상 동작 (의도 분석 → KB 검색 → 답변 생성 → 라우팅)
- 인증/인가 보안 정상 동작
- Private/Public 메시지 격리 정상 동작
