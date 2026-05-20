# Repository 레이어 코드 요약

## 파일 목록

| 파일 | 소유 테이블 |
|---|---|
| `src/repositories/llm-usage.repository.ts` | llm_usage_logs |
| `src/repositories/knowledge-base.repository.ts` | knowledge_base_entries |

## llm-usage.repository

| 메서드 | 설명 | 사용처 |
|---|---|---|
| `createUsageLog(input)` | LLM 호출 로그 저장 | AIService.logUsage |
| `findByPeriod(start, end)` | 기간별 로그 조회 | Unit 4 통계 |
| `getCostStats(start, end, groupBy)` | 비용 집계 (모델별/일별/요청유형별) | Unit 4 대시보드 |

## knowledge-base.repository

| 메서드 | 설명 | 사용처 |
|---|---|---|
| `create(entry)` | 단건 KB 엔트리 생성 | 피드백 학습 데이터 |
| `createMany(entries, sourceType)` | 배치 적재 | DataPipelineService |
| `findByCategory(category, limit)` | 카테고리별 조회 | 관리자 KB 관리 |
| `updateIndexedAt(ids)` | 색인 완료 시간 업데이트 | KB 재색인 후 |
| `getStats()` | 전체 통계 (총건수, 유형별) | 관리자 대시보드 |
