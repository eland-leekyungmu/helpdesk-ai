# Integration Test Instructions

## 실행 조건
- `.env` 환경변수 설정 완료
- RDS 접속 가능
- AWS Bedrock 자격 증명 유효

## 실행 명령
```bash
cd helpdesk-ai
INTEGRATION=true npx vitest --run tests/integration/
```

## 기존 통합 테스트
| 파일 | 대상 | 검증 내용 |
|------|------|-----------|
| tests/integration/ai-service.integration.test.ts | AI Service | analyzeIntent, generateAnswer, transformToPublic |

## 통합 테스트 시나리오 (수동 검증)

### 시나리오 1: 티켓 생성 → AI 자동 응답 흐름
1. employee 로그인
2. POST /api/tickets (subject + content)
3. AI가 의도 분석 → KB 검색 → 신뢰도 산출
4. 신뢰도 ≥ 0.5: AI 답변 public 메시지 + 티켓 resolved
5. 신뢰도 < 0.5: 2차 처리자 자동 분배 또는 1차 큐 에스컬레이션

### 시나리오 2: 메시지 추가 → 티켓 완료
1. agent_l1 public 메시지 → 티켓 resolved (resolutionType: agent_l1)
2. agent_l2 private 메시지 → AI public 변환 → 티켓 resolved (resolutionType: agent_l2)

### 시나리오 3: 분배 거절 → 재분배
1. agent_l2가 분배 거절 (reason + suggestedUserId)
2. 추천 담당자로 재분배 또는 같은 팀 내 다른 agent 자동 배정
3. 재분배 불가 시 1차 처리자 큐로 에스컬레이션

### 시나리오 4: 피드백 → KB 학습
1. employee가 AI 답변에 👍 피드백
2. 티켓 closed 처리
3. KnowledgeBaseEntry에 질문-답변 쌍 저장

## 통과 기준
- 모든 통합 테스트 PASS
- AI 응답 시간 < 30초
- DB 트랜잭션 정합성 유지
