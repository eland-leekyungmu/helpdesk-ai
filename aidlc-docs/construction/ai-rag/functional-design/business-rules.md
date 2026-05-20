# Unit 3: AI/RAG — Business Rules

---

## 1. 카테고리 정의 (Closed Set)

### 1.1 사전 정의 카테고리 목록

카테고리는 2차 처리자 조직 구조(이랜드이노플)의 부서/팀과 매핑됩니다.

| # | 카테고리 | 매핑 부서 | 매핑 팀 |
|---|---|---|---|
| 1 | 웹/앱 개발 | IT개발부서 | 개발3팀 |
| 2 | ERP 시스템 | IT개발부서 / 시스템운영부서 | ERP팀 |
| 3 | CRM 시스템 | IT개발부서 / 시스템운영부서 | CRM팀 |
| 4 | 클라우드 인프라 | 인프라보안부서 | 클라우드팀 |
| 5 | 네트워크 | 인프라보안부서 | 네트워크팀 |
| 6 | IT 인프라 (서버/스토리지) | 인프라보안부서 | 정보인프라팀 |
| 7 | 정보보안 | 인프라보안부서 | 정보보안팀 |
| 8 | 데이터/분석 플랫폼 | 데이터플랫폼부서 | 데이터플랫폼팀 |
| 9 | AX/업무혁신 | 데이터플랫폼부서 | AX혁신팀 |
| 10 | BI/리포트 | 데이터플랫폼부서 | BI팀 |
| 11 | 데이터사이언스/AI | 데이터플랫폼부서 | 데이터사이언스팀 |
| 12 | 그룹웨어 (메일/캘린더/결재) | 시스템운영부서 | 그룹웨어팀 |
| 13 | SCM (공급망) | 시스템운영부서 | SCM팀 |
| 14 | FCM (매장관리) | 시스템운영부서 | FCM팀 |
| 15 | 경영기획 시스템 | 경영지원부서 | 기획팀 |
| 16 | 경영지원 시스템 | 경영지원부서 | 경영지원팀 |
| 17 | HR/인사 시스템 | 인사부서 | HR팀 |
| 18 | 인사/총무 | 인사부서 | 인사총무팀 |
| 19 | 재무/회계 시스템 | 재무부서 | 재무팀 |
| 20 | 세무/행정 | 재무부서 | 세무행정팀 |
| 21 | 홍보/마케팅 시스템 | 홍보부서 | 홍보마케팅팀 |
| 22 | 계정/권한 관리 | (공통) | 1차 처리자 판단 |
| 23 | 기타 | (공통) | 1차 처리자 큐 |

### 1.2 카테고리 분배 규칙

- 카테고리 → 팀 매핑이 존재하면 해당 팀의 `agent_l2` 역할 사용자에게 분배
- 한 팀에 여러 `agent_l2`가 있으면 **라운드 로빈** 또는 **현재 활성 건수 최소** 기준 선택
- "계정/권한 관리", "기타" 카테고리는 2차 분배 불가 → `escalate_to_l1`

---

## 2. 모델 라우팅 규칙

### BR-MODEL-01: 첨부파일 기반 모델 선택
- **조건**: `attachments` 배열에 1개 이상의 파일이 존재
- **결과**: heavy 모델 (Claude Opus) 사용
- **적용 대상**: generateAnswer만 해당

### BR-MODEL-02: 텍스트 전용 경량 모델
- **조건**: 첨부파일 없음 (텍스트만)
- **결과**: lightweight 모델 (Claude Haiku) 사용

### BR-MODEL-03: 보조 작업은 항상 lightweight
- **적용 대상**: transformToPublic, suggestCategory, 합성 데이터 생성
- **결과**: 항상 lightweight (Claude Haiku)

---

## 3. 신뢰도 판정 규칙

### BR-CONF-01: 신뢰도 산출
- RAG 검색 결과 상위 10건의 score 평균
- 검색 결과 0건 → confidence = 0

### BR-CONF-02: 임계값 기반 판정
- confidence >= threshold(0.8) → AI 직접 답변
- confidence < threshold + 카테고리 매칭 가능 → 2차 분배
- confidence < threshold + 카테고리 매칭 불가 → 1차 처리자 큐

### BR-CONF-03: 임계값 관리
- 기본값: 0.8
- 관리자가 설정 화면에서 변경 가능
- 유효 범위: 0.5 ~ 0.95

---

## 4. transformToPublic 규칙

### BR-TRANSFORM-01: 변환 허용 범위
- ✅ 호칭/지칭 변경 (내부 → 일반)
- ✅ 내부 시스템명/프로세스명 일반화
- ✅ 문체 통일 (친절한 고객 응대)
- ❌ 사실적 내용 변경
- ❌ 정보/지시사항 추가 또는 삭제
- ❌ 절차 순서 변경

### BR-TRANSFORM-02: 실패 시 처리
- LLM 호출 실패 → 원본 Private 메시지 텍스트 그대로 반환
- 내용 보존이 변환보다 우선

---

## 5. 합성 데이터 규칙

### BR-SYNTH-00: 시드 데이터 생성 (소스 데이터 없음)
- 실 데이터가 없으므로 LLM으로 시드 데이터를 먼저 생성
- 23개 카테고리별 20~25건씩 (총 ~500건)
- LLM에게 "이 카테고리에서 나올 법한 IT Help Desk 문의-답변" 생성 요청
- 시드 데이터에도 department, team 메타데이터 포함
- 시드 데이터 생성 후 → 합성 확장 (10만 건)

### BR-SYNTH-01: 소스 데이터 형식
- JSON 파일 (question, answer, category 필드 필수)
- 인코딩: UTF-8

### BR-SYNTH-02: 생성 방식
- 원본 데이터를 그대로 복제 금지
- 동일 유형/패턴의 새로운 질문-답변 생성
- 변형 방식: paraphrase, 시나리오 확장, 상상 기반 신규 케이스

### BR-SYNTH-03: 품질 검증
- 중복 제거: 유사도 90% 이상이면 중복으로 판정하여 제거
- 형식 검증: question, answer, category, department, team 필드 존재 여부
- 카테고리: 사전 정의 목록(23개) 중 하나여야 함
- department/team: 조직 구조에 존재하는 값이어야 함

### BR-SYNTH-04: 배치 실행
- 한 번에 전체 실행 (중간 중단 없음)
- 실행 중 진행률 로깅

---

## 6. LLM 사용 로깅 규칙

### BR-LOG-01: 로깅 대상
- 모든 LLM 호출 (generateAnswer, transformToPublic, suggestCategory, 합성 데이터)
- 기록 항목: 모델명, 모델 타입, 입력/출력 토큰, 비용(USD), 요청 유형, 응답 시간

### BR-LOG-02: 비용 계산
- 모델별 토큰 단가는 환경 변수로 관리
- cost_usd = (input_tokens * input_price) + (output_tokens * output_price)

### BR-LOG-03: 비용 제어
- 비용 상한 없음 (로깅만 수행)
- 관리자가 대시보드에서 모니터링

---

## 7. KB 메타데이터 규칙

### BR-KB-META-01: 메타데이터 구조
KB에 적재되는 모든 엔트리는 다음 메타데이터를 포함:

| 필드 | 타입 | 설명 |
|---|---|---|
| category | string | 카테고리 (23개 중 하나) |
| source_type | string | real_data / synthetic / feedback |
| department | string | 담당 부서명 |
| team | string | 담당 팀명 |

### BR-KB-META-02: 검색 시 필터 적용
- `analyzeIntent`가 추정한 department/team으로 KB 검색 필터 설정
- 필터 매칭 결과가 부족하면 (3건 미만) 필터 없이 전체 검색으로 fallback
- fallback 시에도 상위 10건 제한 유지

### BR-KB-META-03: 의도 분석 (analyzeIntent)
- 문의 접수 시 가장 먼저 실행
- lightweight(Haiku) 모델 사용
- 조직 구조(8개 부서, 23개 팀) + 카테고리 목록을 프롬프트에 포함
- 한 번의 LLM 호출로 department, team, categories 모두 반환
- suggestCategory 기능을 통합 (별도 호출 불필요)

---

## 8. KB 재색인 규칙

### BR-KB-01: 자동 재색인
- 매일 야간(예: 02:00 KST) 자동 실행
- Bedrock KB StartIngestionJob API 호출

### BR-KB-02: 수동 재색인
- 관리자가 설정 화면에서 트리거 가능
- 동시 실행 방지 (이미 진행 중이면 무시)

---

## 9. 재시도 규칙

### BR-RETRY-01: Bedrock API 호출
- 최대 2회 재시도
- Exponential backoff: 1초 → 2초
- 재시도 대상: 5xx 에러, 타임아웃, ThrottlingException

### BR-RETRY-02: 재시도 실패 시
- generateAnswer → escalate_to_l1 반환
- transformToPublic → 원본 텍스트 반환
- suggestCategory → 빈 배열 반환
- logUsage → 로그 유실 허용 (비즈니스 크리티컬 아님)
