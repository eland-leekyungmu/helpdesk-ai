# 본인 아님 처리 / 재분배 결함 수정 요구사항

**작성일**: 2026-05-15
**유형**: 버그 수정 + 기능 개선 (Standard depth)

---

## 결함 목록

### BUG-1: agent_l2가 /api/admin/agents 호출 시 403
- **원인**: withRole(['admin', 'agent_l1'])에 agent_l2 미포함
- **수정**: withRole에 agent_l2 추가

### BUG-2: handleReject가 assignmentId 없이 ticketId만 전송
- **원인**: reject API는 assignmentId 필수인데 ticketId만 전송
- **수정**: 티켓 상세 데이터에서 active assignment id 추출 후 전송

### BUG-3: AI 재분배 시 같은 사람에게 재배정 가능
- **원인**: rejectAssignment에서 AI 재분배 시 previousAssignees 필터 미적용
- **수정**: findAgentByTeam에 excludeIds 파라미터 추가, previousAssignees 전달

### BUG-4: 본인 아님 모달에서 본인이 추천 목록에 포함
- **원인**: agents 목록에서 현재 사용자 필터링 없음
- **수정**: JWT에서 userId 추출 후 agents 목록에서 본인 제외

---

## 추가 개선 사항 (AI 의견)

### IMP-1: reject API가 ticketId도 받을 수 있도록 유연화
- assignmentId 없이 ticketId만 있어도 active assignment를 서버에서 조회하도록 개선
- 클라이언트 부담 감소

### IMP-2: 재분배 결과를 UI에 표시
- 재분배 후 누구에게 배정됐는지 토스트로 표시

---

## 수정 파일
1. src/app/api/admin/agents/route.ts
2. src/app/api/tickets/reject/route.ts
3. src/services/ticket.service.ts (rejectAssignment, findAgentByTeam)
4. src/app/(agent)/tickets/[id]/page.tsx
