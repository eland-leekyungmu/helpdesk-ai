# Story Generation Plan

## 접근 방식: Persona-Based + User Journey Hybrid

이 프로젝트는 4개의 명확한 사용자 역할이 있으므로, **Persona 기반**으로 스토리를 그룹화하되 각 Persona 내에서는 **User Journey** 순서로 스토리를 배치합니다.

---

## Execution Checklist

### Part A: Personas 생성
- [x] 임직원(요청자) Persona 정의
- [x] 1차 처리자 Persona 정의
- [x] 2차 처리자 Persona 정의
- [x] 관리자 Persona 정의

### Part B: User Stories 생성
- [x] Epic 1: 문의 접수 및 AI 자동 응답 (임직원 관점)
- [x] Epic 2: 티켓 히스토리 조회 (임직원 관점)
- [x] Epic 3: 에스컬레이션 처리 (1차 처리자 관점)
- [x] Epic 4: 2차 분배 수신 및 처리 (2차 처리자 관점)
- [x] Epic 5: 이메일 티켓 처리 (시스템/임직원 관점)
- [x] Epic 6: 관리자 대시보드 및 통계 (관리자 관점)
- [x] Epic 7: 인증 및 권한 관리 (전체 역할)
- [x] Epic 8: 피드백 루프 및 학습 (관리자/시스템 관점)
- [x] Epic 9: 합성 데이터 생성 (시스템/데이터 엔지니어 관점)

### Part C: 검증
- [x] INVEST 기준 검증
- [x] Acceptance Criteria 완성도 확인
- [x] Persona-Story 매핑 확인

---

## Questions

아래 질문에 답변해 주세요.

---

## Question 1
스토리의 세분화 수준은 어느 정도가 적절할까요?

A) 큰 단위 (Epic 수준, 8~10개 스토리) — 전체 흐름 파악 중심
B) 중간 단위 (Feature 수준, 20~30개 스토리) — 개발 단위로 활용 가능
C) 세밀한 단위 (Task 수준, 40개 이상) — 스프린트 계획에 바로 활용
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 2
Acceptance Criteria 형식은 어떤 것을 선호하나요?

A) Given-When-Then (BDD 스타일)
B) 체크리스트 형식 (간결한 조건 나열)
C) 혼합 (핵심 시나리오는 Given-When-Then, 나머지는 체크리스트)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 3
스토리 우선순위 표기가 필요한가요?

A) 필요 없음 — 모든 스토리가 MVP에 포함되므로 동일 우선순위
B) MoSCoW (Must/Should/Could/Won't) 표기
C) 숫자 우선순위 (P1, P2, P3)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 4
2차 처리자의 "본인 업무 아님" 판단 기준에 대해 추가 시나리오가 있나요?

A) 단순히 "본인 아님" 버튼 클릭으로 충분
B) "본인 아님" + 사유 입력 필수
C) "본인 아님" + 올바른 담당자 추천 필수
D) "본인 아님" + 사유 입력 + 담당자 추천 (선택)
X) Other (please describe after [Answer]: tag below)

[Answer]: A, 담당자 입력은 선택사항. 

---

## Question 5
임직원이 문의 시 카테고리를 직접 선택하나요, 아니면 AI가 자동 분류하나요?

A) 임직원이 카테고리 선택 (네트워크, 소프트웨어, 하드웨어 등)
B) AI가 자동 분류 (임직원은 자연어만 입력)
C) 임직원이 선택적으로 카테고리 지정 가능 (미지정 시 AI 자동 분류)
X) Other (please describe after [Answer]: tag below)

[Answer]: AI 가 추천을 하는 것으로 함. 

---
