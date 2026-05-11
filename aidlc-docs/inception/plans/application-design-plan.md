# Application Design Plan

## 설계 범위
- 전체 시스템 아키텍처
- 컴포넌트 식별 및 책임 정의
- DB 모델링 초안 (ERD, 테이블 소유권)
- API 인터페이스 경계 (유닛 간 통신 계약)
- 공유 타입/DTO 정의
- 디렉토리 구조 확정

---

## Execution Checklist

### Part A: 시스템 아키텍처
- [x] 전체 시스템 아키텍처 다이어그램
- [x] 기술 스택 매핑 (컴포넌트 → 기술)
- [x] 외부 시스템 연동 포인트 (SES, Bedrock, KB)

### Part B: 컴포넌트 설계
- [x] components.md — 컴포넌트 정의 및 책임
- [x] component-methods.md — 메서드 시그니처
- [x] services.md — 서비스 레이어 및 오케스트레이션
- [x] component-dependency.md — 의존성 및 통신 패턴

### Part C: DB 모델링 초안
- [x] ERD (엔티티 관계도)
- [x] 테이블 목록 및 주요 컬럼
- [x] 테이블 간 관계 (FK, 인덱스 전략)
- [x] 유닛별 테이블 소유권 매핑

### Part D: API 인터페이스 경계
- [x] 유닛 간 API 계약 정의
- [x] 공유 타입/DTO 정의
- [x] 이벤트/메시지 포맷

### Part E: 디렉토리 구조
- [x] 프로젝트 디렉토리 구조 확정
- [x] 유닛별 독립 디렉토리 배치

---

## Questions

---

## Question 1
Next.js 프로젝트 구조는 어떤 방식을 선호하나요?

A) 모노레포 (하나의 Next.js 앱, 내부 모듈로 분리, 단일 배포)
B) 모노레포 + 공유 라이브러리 (Turborepo 등으로 관리, 유닛별 패키지 분리하되 하나의 Next.js 앱으로 배포)
C) 멀티 앱 (유닛별 독립 Next.js 앱, 개별 배포)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2
배포 형태는?

A) Next.js: ECS Fargate (컨테이너, SSR + API Routes 모두)
B) Next.js: Lambda@Edge + S3 (서버리스 SSR)
C) Next.js: Amplify Hosting (관리형)
D) Next.js: Vercel
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 3
유닛 간 통신 방식은?

A) 동기 (REST API 직접 호출)
B) 비동기 (SQS/SNS 이벤트 기반)
C) 혼합 (실시간 필요한 건 REST, 비동기 가능한 건 이벤트)
X) Other (please describe after [Answer]: tag below)

[Answer]: C 

---

## Question 4
합성 데이터 생성은 어떤 형태로 실행되나요?

A) 일회성 배치 스크립트 (프로젝트 초기에 한번 실행)
B) 관리자가 트리거하는 배치 작업 (필요 시 반복 실행)
C) 스케줄 기반 자동 실행 (주기적으로 데이터 보강)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---
