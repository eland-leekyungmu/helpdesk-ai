# Unit Test Execution

## 실행 명령
```bash
cd helpdesk-ai
npm test
# 또는
npx vitest --run
```

## 기존 단위 테스트
| 파일 | 대상 | 검증 내용 |
|------|------|-----------|
| tests/unit/services/ai.service.test.ts | AIService | routeToModel, assessConfidence |
| tests/unit/services/data-pipeline.service.test.ts | DataPipeline | 데이터 파이프라인 로직 |
| tests/unit/repositories/knowledge-base.repository.test.ts | KB Repository | KB 엔트리 CRUD |
| tests/unit/repositories/llm-usage.repository.test.ts | LLM Usage | 사용 로그 저장/조회 |

## 커버리지 확인
```bash
npx vitest --run --coverage
```

## 테스트 통과 기준
- 전체 테스트 PASS
- 커버리지 목표: 서비스 레이어 70% 이상
