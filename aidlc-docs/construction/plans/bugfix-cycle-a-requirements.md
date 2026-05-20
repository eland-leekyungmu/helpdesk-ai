# 결함 수정 사이클 A — 요구사항 문서

**작성일**: 2026-05-15  
**유형**: 버그 수정 묶음 (Minimal depth)  
**대상 결함**: #1, #2, #3, #4, #6, #7, #9, #10, #12

---

## 결함별 원인 및 수정 방향

### BUG-01 | 2차 처리자 답변 완료 후 답변창 계속 표시
- **파일**: `src/app/(agent)/tickets/[id]/page.tsx`
- **원인**: 답변 입력창 렌더링 시 `ticket.status` 체크 없음 → resolved/closed 상태에서도 항상 표시
- **수정**: `ticket.status === "resolved" || ticket.status === "closed"` 일 때 입력창 숨기고 "이 티켓은 해결되었습니다" 안내 표시

### BUG-02 | 하드코딩 데이터 노출 — 대시보드 트렌드 차트
- **파일**: `src/app/(admin)/dashboard/page.tsx`
- **원인**: `TREND_DATA` 상수로 하드코딩된 더미 데이터 사용
- **수정**: `/api/analytics/tickets` API 실제 연동 (기간별 집계 데이터 활용)

### BUG-03 | 하드코딩 데이터 노출 — 관리자/처리자 레이아웃 사용자명
- **파일**: `src/app/(admin)/layout.tsx`, `src/app/(agent)/layout.tsx`
- **원인**: admin layout은 `userName="최관리"` 하드코딩. agent layout은 JWT email prefix를 이름으로 표시
- **수정**: 
  - admin layout: AgentLayout과 동일하게 `/api/auth/me` 호출로 실제 이름 표시
  - agent layout: API 응답 전까지 이름 영역 skeleton 표시 (email prefix 표시 제거)

### BUG-04 | 해결(resolved) vs 종료(closed) 차이 불명확
- **파일**: `src/app/(admin)/all-tickets/page.tsx`, `src/components/ui/Badge.tsx`
- **원인**: 두 상태의 의미 차이가 UI에 표시되지 않음
- **수정**: StatusBadge에 tooltip 추가 (resolved: "처리 완료", closed: "최종 종료"), 필터 레이블에 설명 추가

### BUG-06 | alert() 잔존
- **현황**: 코드 분석 결과 이미 Toast로 교체 완료. 추가 수정 불필요.

### BUG-07 | 2차 처리자 동시 배정 방지
- **파일**: `src/services/ticket.service.ts`
- **원인**: `assignTicket`에 트랜잭션 처리 없어 동시 요청 시 중복 배정 가능
- **수정**: `assignTicket` 로직을 `prisma.$transaction()`으로 감싸서 원자성 보장

### BUG-09 | 1차 Fallback 시 담당자 "미배정" 표시
- **파일**: `src/app/(agent)/tickets/[id]/page.tsx`, `src/app/(admin)/all-tickets/page.tsx`
- **원인**: `assignedTo === null && status === "open"` 상태에서 담당자를 null로 표시
- **수정**: UI에서 `assignedTo === null && status === "open"` 조건일 때 "1차 처리자 큐" 텍스트 표시

### BUG-10 | 사용자 관리 편집 미동작
- **파일**: `src/app/(admin)/users/page.tsx`
- **원인**: 편집 버튼에 onClick 핸들러 없음, 편집 모달 미구현
- **수정**: 편집 모달 구현 (이름, 역할, 팀 수정), `/api/admin/users/[id]` PUT API 연동

### BUG-12 | 로그인 시 아이디(email prefix) 노출
- **파일**: `src/app/(agent)/layout.tsx`
- **원인**: JWT 파싱 후 `payload.email?.split("@")[0]`을 이름으로 임시 표시
- **수정**: API 응답 전까지 이름 영역을 skeleton으로 표시, email prefix 표시 제거

---

## 수정 파일 목록

1. `src/app/(agent)/tickets/[id]/page.tsx` — BUG-01, BUG-09
2. `src/app/(admin)/dashboard/page.tsx` — BUG-02
3. `src/app/(admin)/layout.tsx` — BUG-03
4. `src/app/(agent)/layout.tsx` — BUG-03, BUG-12
5. `src/components/layout/Sidebar.tsx` — BUG-12 (skeleton 지원)
6. `src/app/(admin)/all-tickets/page.tsx` — BUG-04, BUG-09
7. `src/components/ui/Badge.tsx` — BUG-04
8. `src/services/ticket.service.ts` — BUG-07
9. `src/app/(admin)/users/page.tsx` — BUG-10
10. `src/app/api/admin/users/[id]/route.ts` — BUG-10 (API 신규)

---

## 비기능 요구사항
- API 로직 변경 최소화 (UI/서비스 레이어 위주)
- TypeScript 진단 통과
- 기존 기능 회귀 없음
