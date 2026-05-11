# Requirements Verification Questions

아래 질문에 대해 각 `[Answer]:` 태그 뒤에 선택지 문자를 기입해 주세요.

---

## Question 1
프론트엔드 기술 스택은 무엇을 사용할 예정인가요?

A) React (Next.js 포함)
B) Vue.js (Nuxt.js 포함)
C) Angular
D) 기타 프레임워크 또는 순수 HTML/JS
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2
백엔드 기술 스택은 무엇을 사용할 예정인가요?

A) Node.js (Express/NestJS)
B) Python (FastAPI/Django)
C) Java (Spring Boot)
D) Go
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 3
데이터베이스는 무엇을 사용할 예정인가요?

A) PostgreSQL (RDS)
B) MySQL (RDS)
C) DynamoDB (NoSQL)
D) PostgreSQL + DynamoDB 혼합
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 4
사용자(임직원) 인증은 어떤 방식을 사용하나요?

A) 사내 SSO (SAML/OIDC) 연동
B) 사내 Active Directory / LDAP 연동
C) Amazon Cognito 기반 자체 인증
D) 별도 인증 없이 이메일 주소로 식별만 함
X) Other (please describe after [Answer]: tag below)

[Answer]: X 자체적으로 DB 사용자 구성하고, PW 관리 

---

## Question 5
AWS 인프라 배포 방식은 무엇을 선호하나요?

A) CDK (TypeScript)
B) CDK (Python)
C) Terraform
D) CloudFormation (YAML/JSON)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 6
이메일 송수신 인프라는 어떤 것을 사용할 예정인가요?

A) Amazon SES (Simple Email Service)
B) 기존 사내 메일 서버 (Exchange/SMTP) 연동
C) 외부 이메일 서비스 (SendGrid, Mailgun 등)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 7
`constraints.md`에 "Feedback Loop 제외"로 되어 있습니다. 요구사항 문서에는 피드백 루프가 포함되어 있는데, MVP 범위에서 피드백 루프를 어떻게 처리할까요?

A) MVP에서 완전히 제외 (향후 구현)
B) 데이터 수집만 하고 자동 재학습은 제외 (수동 재학습은 가능)
C) 전체 피드백 루프 포함 (constraints.md 수정)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 8
`constraints.md`에 "Zendesk 연동 제외"로 되어 있습니다. 이메일 티켓 식별 기능은 Zendesk 없이 자체 구현하는 것이 맞나요?

A) 맞다. Zendesk 없이 자체 이메일 티켓 식별 시스템 구현
B) Zendesk를 티켓 관리 백엔드로 사용하되 API 연동만 제외
C) Zendesk 완전 제외, 자체 티켓 관리 시스템 구축
X) Other (please describe after [Answer]: tag below)

[Answer]: A . 젠데스크와 같은 MVP 를 지금 만들 예정.

---

## Question 9
2차 처리자의 Private 답변이 요청자에게 Public으로 전달되는 경로는 어떻게 할까요?

A) 1차 처리자가 2차 답변을 검토/가공 후 Public으로 회신
B) AI(LLM)가 2차의 Private 답변을 자동 가공하여 Public으로 회신
C) 둘 다 가능 (단순 답변은 AI 자동, 복잡한 건은 1차 처리자 검토)
X) Other (please describe after [Answer]: tag below)

[Answer]: B, AI 가 바로 답변을 할 수도 있음. 

---

## Question 10
신뢰도 점수(score) 임계값의 초기 설정은 어떻게 할까요?

A) 보수적으로 높게 설정 (많은 건이 1차 처리자에게 에스컬레이션, 안전 우선)
B) 중간 수준으로 설정 (균형)
C) 적극적으로 낮게 설정 (AI가 최대한 답변, 오답 리스크 감수)
D) A/B 테스트로 최적값 탐색
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 11
관리자/1차 처리자 인증은 임직원 인증과 동일한 시스템을 사용하나요, 별도인가요?

A) 동일 인증 시스템 + 역할(Role) 기반 권한 분리
B) 관리자/처리자 전용 별도 인증 시스템
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 12
MVP에서 실시간 알림(신규 티켓 등)은 어떤 수준으로 구현할까요?

A) SSE (Server-Sent Events) 기반 실시간 알림
B) WebSocket 기반 실시간 알림
C) 폴링(Polling) 방식 (단순 구현)
D) MVP에서는 알림 없이 수동 새로고침
X) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Question 13: Security Extensions
이 프로젝트에 보안 확장 규칙(SECURITY rules)을 적용할까요?

A) Yes — 모든 SECURITY 규칙을 blocking constraint로 적용 (프로덕션 수준 권장)
B) No — SECURITY 규칙 스킵 (PoC/프로토타입/실험 프로젝트에 적합)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---
