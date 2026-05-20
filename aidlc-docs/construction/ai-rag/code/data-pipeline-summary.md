# DataPipelineService 코드 요약

## 파일 위치
`helpdesk-ai/src/services/data-pipeline.service.ts`

## 구현 메서드

| 메서드 | 설명 |
|---|---|
| `generateSeedData(options?)` | 카테고리별 시드 데이터 LLM 생성 (~500건) |
| `loadSourceData(filePath)` | JSON 파일에서 소스 데이터 로드 |
| `generateSynthetic(sourceData, options)` | 소스 기반 합성 데이터 확장 (10만 건 목표) |
| `validateQuality(entries)` | 중복 제거 + 형식 검증 + 카테고리 유효성 |
| `loadToKB(entries)` | DB 배치 적재 (500건 단위) |

## 데이터 흐름

```
generateSeedData() → 카테고리별 22건 × 22개 = ~484건 시드
        ↓
generateSynthetic(seedData, { count: 100000 }) → 10만 건 합성
        ↓
validateQuality(syntheticEntries) → 중복/형식 제거
        ↓
loadToKB(validEntries) → knowledge_base_entries 테이블 적재
```

## 배치 스크립트

| 스크립트 | 실행 방법 |
|---|---|
| `scripts/data-pipeline/generate-synthetic.ts` | `npx ts-node scripts/data-pipeline/generate-synthetic.ts [건수] [출력경로]` |
| `scripts/data-pipeline/validate-and-load.ts` | `npx ts-node scripts/data-pipeline/validate-and-load.ts [입력경로]` |

## 품질 검증 기준
- 필수 필드: question, answer, category, department, team
- 카테고리: 23개 사전 정의 목록 중 하나
- 중복: 정규화된 질문 문자열 기준 (소문자 + 공백 통일)
