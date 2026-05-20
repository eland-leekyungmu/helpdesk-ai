# Unit 3: AI/RAG — 상세 설계 질문

아래 질문에 답변해주세요. 각 질문의 `[Answer]:` 뒤에 선택지 문자를 입력하시면 됩니다.
선택지가 맞지 않으면 X를 선택하고 설명을 추가해주세요.

---

## 비즈니스 로직 (Business Logic)

## Question 1
RAG 검색 시 유사도 매칭 결과를 몇 건까지 참조하여 답변을 생성할까요?

A) 3건 (빠른 응답, 간결한 답변)
B) 5건 (균형)
C) 10건 (풍부한 컨텍스트, 느린 응답)
D) 동적 조절 (신뢰도가 낮으면 더 많이 검색)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 2
신뢰도(confidence) 점수 산출 방식은 어떻게 할까요?

A) RAG 유사도 점수 평균 (Knowledge Base가 반환하는 score 활용)
B) RAG 유사도 + LLM 자체 판단 (LLM에게 "이 답변에 얼마나 확신하는가" 물어봄)
C) RAG 유사도 + 검색 결과 수 + 카테고리 일치도 복합 계산
X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
신뢰도 임계값(threshold) 기본값은 얼마로 설정할까요? (관리자가 나중에 변경 가능)

A) 0.7 (70% — 보수적, 2차 분배 많음)
B) 0.8 (80% — 중간)
C) 0.85 (85% — 적극적, AI 답변 많음)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4
`determineRouting`에서 "2차 분배 대상자"를 어떻게 결정할까요?

A) 카테고리 기반 — 티켓 카테고리와 매칭되는 팀/담당자에게 분배
B) 이전 유사 티켓 처리자 기반 — RAG 검색 결과의 원본 티켓 처리자에게 분배
C) A + B 복합 (카테고리 우선, fallback으로 이전 처리자)
D) AI가 판단하지 않음 — 1차 처리자 큐에만 넣고, 1차 처리자가 수동 분배
X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
`transformToPublic` (Private → Public 변환) 시 "문맥만 수정"의 구체적 범위는?

A) 호칭/지칭만 변경 (예: "김과장님" → "담당자", 내부 용어 → 일반 용어)
B) 호칭 + 내부 시스템명/프로세스명 제거 (예: "SAP에서 확인하면" → "시스템에서 확인하면")
C) 호칭 + 내부 정보 제거 + 문체 통일 (딱딱한 내부 문체 → 친절한 고객 응대 문체)
X) Other (please describe after [Answer]: tag below)

[Answer]: C, 해당 작업을 위한 LLM은 lite한걸로 사용하길 원해.

## Question 6
카테고리 추천(`suggestCategory`)은 어떤 방식으로 동작할까요?

A) 사전 정의된 카테고리 목록에서 LLM이 선택 (closed set)
B) LLM이 자유롭게 생성 (open set, 새 카테고리 가능)
C) 사전 정의 목록 우선 + 매칭 안 되면 "기타"로 분류
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## 모델 라우팅 (Model Routing)

## Question 7
경량 모델(lightweight)과 고성능 모델(heavy)로 각각 어떤 Bedrock 모델을 사용할까요?

A) lightweight: Claude Haiku, heavy: Claude Sonnet
B) lightweight: Claude Haiku, heavy: Claude Opus
C) lightweight: Claude Sonnet, heavy: Claude Opus
D) 아직 미정 — 코드에서 환경 변수로 설정 가능하게만 해줘
X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 8
멀티모달 입력(이미지 첨부) 판별 기준은?

A) 첨부파일에 이미지(jpg/png/gif/webp)가 1개 이상 있으면 heavy 모델
B) 첨부파일 유무와 관계없이 항상 lightweight 먼저 시도, 실패 시 heavy fallback
C) 첨부파일 크기/개수 기반 (예: 이미지 3개 이상이면 heavy)
X) Other (please describe after [Answer]: tag below)

[Answer]: A, 첨부파일에는 이미지뿐만 아니라 pdf, 워드, 엑셀 등 다양하게 가능

---

## 합성 데이터 (Data Pipeline)

## Question 9
합성 데이터 생성 시 소스 데이터 형식은?

A) JSON (question/answer/category 필드)
B) CSV (컬럼: question, answer, category)
C) 둘 다 지원
X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 10
10만 건 생성 시 배치 처리 전략은?

A) 한 번에 전체 실행 (시간 오래 걸려도 OK)
B) 청크 단위 (예: 1000건씩) + 중간 저장 + 이어하기(resume) 지원
C) 병렬 처리 (동시 N개 LLM 호출)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 11
합성 데이터 품질 검증 기준은?

A) 중복 제거 (유사도 90% 이상이면 중복) + 형식 검증 (필수 필드 존재)
B) A + 최소 길이 검증 (질문 10자 이상, 답변 20자 이상)
C) A + B + LLM 기반 품질 점수 (0~1, 임계값 이하 제거)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## NFR (비기능 요구사항)

## Question 12
AI 답변 생성 응답 시간 목표는?

A) 3초 이내 (사용자 체감 빠름)
B) 5초 이내 (허용 가능)
C) 10초 이내 (RAG + LLM 특성상 여유 있게)
D) 스트리밍 응답 (첫 토큰 1초 이내, 전체 완료는 5~10초)
X) Other (please describe after [Answer]: tag below)

[Answer]: C, heavy의 경우 5분

## Question 13
LLM 호출 실패 시 재시도 전략은?

A) 최대 2회 재시도 (exponential backoff)
B) 최대 3회 재시도 + 다른 모델로 fallback
C) 재시도 없음 — 즉시 1차 처리자 큐로 에스컬레이션
X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 14
LLM 비용 제어 방법은?

A) 일일 비용 상한 설정 (초과 시 AI 답변 중단, 모두 1차 처리자 큐로)
B) 월간 예산 알림만 (초과해도 계속 동작)
C) 비용 제어 없음 — 로깅만 하고 관리자가 모니터링
X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 15
Knowledge Base 재색인 빈도는?

A) 실시간 (새 엔트리 추가될 때마다)
B) 배치 (1일 1회 야간)
C) 수동 트리거 (관리자가 버튼 클릭 시)
D) B + C 혼합 (야간 자동 + 수동 트리거 가능)
X) Other (please describe after [Answer]: tag below)

[Answer]: D

---

답변 완료 후 알려주세요.
