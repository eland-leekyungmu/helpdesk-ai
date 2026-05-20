# 환경 변수 및 설정 요약

## 환경 변수 (.env)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `AWS_REGION` | ap-northeast-2 | AWS 리전 |
| `BEDROCK_MODEL_LIGHTWEIGHT` | anthropic.claude-3-haiku-20240307-v1:0 | 경량 모델 ID |
| `BEDROCK_MODEL_HEAVY` | anthropic.claude-3-opus-20240229-v1:0 | 고성능 모델 ID |
| `BEDROCK_KB_ID` | (필수) | Bedrock Knowledge Base ID |
| `CONFIDENCE_THRESHOLD` | 0.8 | 신뢰도 임계값 (관리자 변경 가능) |
| `DATABASE_URL` | (필수) | PostgreSQL 연결 문자열 |

## 모델 라우팅 설정

| 작업 | 모델 | 응답 시간 목표 |
|---|---|---|
| 답변 생성 (텍스트) | Haiku (lightweight) | 10초 이내 |
| 답변 생성 (첨부) | Opus (heavy) | 5분 이내 |
| 의도 분석 | Haiku | 10초 이내 |
| Public 변환 | Haiku | 10초 이내 |
| 카테고리 추천 | Haiku (analyzeIntent 통합) | 10초 이내 |
| 합성 데이터 생성 | Haiku | 제한 없음 (배치) |

## 토큰 단가 (USD per 1K tokens)

| 모델 | Input | Output |
|---|---|---|
| Claude 3 Haiku | $0.00025 | $0.00125 |
| Claude 3 Opus | $0.015 | $0.075 |

## 재시도 설정
- 최대 재시도: 2회
- Backoff: 1초 → 2초 (exponential)
- 재시도 대상: 5xx, ThrottlingException, timeout

## KB 검색 설정
- Top-K: 10건
- Fallback 임계값: 필터 결과 3건 미만 시 전체 검색
- 메타데이터 필터: department, team
