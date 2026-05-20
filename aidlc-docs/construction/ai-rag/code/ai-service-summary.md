# AIService 코드 요약

## 파일 위치
`helpdesk-ai/src/services/ai.service.ts`

## 구현 메서드

| 메서드 | 모델 | 설명 |
|---|---|---|
| `routeToModel(attachments?)` | - | 첨부파일 유무로 lightweight/heavy 결정 |
| `analyzeIntent(question)` | Haiku | 의도 분석 → department, team, categories 반환 |
| `generateAnswer(ticketId, question, attachments?)` | Haiku/Opus | 의도 분석 + KB 검색(필터) + 답변 생성 + 신뢰도 산출 |
| `assessConfidence(ragResults)` | - | RAG 상위 10건 score 평균 |
| `determineRouting(confidence, ragResults, intentResult, answer)` | - | 임계값 기반 라우팅 판정 |
| `transformToPublic(privateContent)` | Haiku | Private → Public 변환 (문맥만 수정) |
| `logUsage(input)` | - | LLM 호출 로그 비동기 저장 |

## 핵심 흐름

```
문의 접수 → routeToModel → analyzeIntent → KB 검색(필터) → LLM 답변 생성
         → assessConfidence → determineRouting → 결과 반환
```

## 보안 고려사항
- SECURITY-03: 구조화된 로깅 (console.error), PII 미포함
- SECURITY-05: 프롬프트 인젝션 방지 (사용자 입력을 명확히 구분된 섹션에 배치)
- SECURITY-15: 모든 외부 호출 try/catch, fail-closed (실패 시 escalate_to_l1)

## 의존성
- `@/lib/bedrock` (invokeModel, retrieveFromKB, calculateCost)
- `@/lib/prisma` (llmUsageLog, user 조회)
- `@/shared/constants/categories` (CATEGORIES, ORGANIZATION_STRUCTURE)
