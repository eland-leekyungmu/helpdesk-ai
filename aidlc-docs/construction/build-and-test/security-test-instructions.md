# Security Test Instructions

## 목적
인증/인가, 입력 검증, 데이터 보호 관련 보안 취약점을 검증합니다.

---

## 보안 테스트 시나리오

### SEC-01: 인증 우회 시도

| # | 테스트 | 기대 결과 |
|---|--------|-----------|
| 1 | Authorization 헤더 없이 API 호출 | 401 Unauthorized |
| 2 | 만료된 JWT로 API 호출 | 401 Invalid Token |
| 3 | 변조된 JWT (payload 수정) | 401 Invalid Token |
| 4 | 다른 사용자의 유효한 JWT로 본인 전용 리소스 접근 | 403 또는 빈 결과 |

### SEC-02: 역할 기반 접근 제어 (RBAC)

| # | 테스트 | 기대 결과 |
|---|--------|-----------|
| 1 | employee가 /api/admin/* 접근 | 403 Forbidden |
| 2 | employee가 /api/tickets/queue 접근 | 403 Forbidden |
| 3 | agent_l2가 /api/tickets/assign 접근 | 403 Forbidden |
| 4 | employee가 다른 사용자 티켓 조회 | null 반환 (접근 불가) |

### SEC-03: 계정 잠금

| # | 테스트 | 기대 결과 |
|---|--------|-----------|
| 1 | 잘못된 비밀번호 5회 연속 | 계정 잠금 (lockedUntil 설정) |
| 2 | 잠금 상태에서 올바른 비밀번호 | "계정이 잠겼습니다" 에러 |
| 3 | 30분 경과 후 로그인 | 정상 로그인 |

### SEC-04: 입력 검증

| # | 테스트 | 기대 결과 |
|---|--------|-----------|
| 1 | subject/content 빈 값으로 티켓 생성 | 400 Validation Error |
| 2 | 매우 긴 문자열 (10,000자+) 입력 | 적절한 처리 (truncate 또는 에러) |
| 3 | SQL Injection 시도 (content에 SQL 구문) | Prisma parameterized query로 안전 |
| 4 | XSS 시도 (content에 script 태그) | 저장은 되나 렌더링 시 이스케이프 |

### SEC-05: 데이터 격리

| # | 테스트 | 기대 결과 |
|---|--------|-----------|
| 1 | employee A가 employee B의 티켓 상세 조회 | null (접근 불가) |
| 2 | agent_l2가 본인 배정 아닌 티켓의 분배 거절 | NOT_YOUR_ASSIGNMENT 에러 |
| 3 | 비활성 사용자로 로그인 | "이메일 또는 비밀번호가 올바르지 않습니다" |

---

## 실행 방법

```bash
# 의존성 보안 취약점 스캔
npm audit

# 수동 API 테스트 (curl 또는 Postman)
# 각 시나리오별 요청 실행 후 응답 코드 확인
```

## 통과 기준
- 모든 인증 우회 시도 차단
- RBAC 정책 100% 적용
- 입력 검증 누락 없음
- npm audit에서 critical/high 취약점 0건
