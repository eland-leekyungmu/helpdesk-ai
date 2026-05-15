# UI 개선 코드 생성 계획

**작성일**: 2026-05-15  
**참조**: ui-improvement-requirements.md

---

## 실행 순서 (의존성 기반)

디자인 시스템 → 레이아웃 → 페이지 순서로 진행.
각 단계는 이전 단계 완료 후 진행.

---

## Step 1: 패키지 설치
- [ ] `lucide-react` 설치
- [ ] `recharts` + `@types/recharts` 설치

## Step 2: 글로벌 CSS 및 디자인 토큰
- [ ] `globals.css` — CSS 변수(컬러 팔레트, 그라디언트), 애니메이션(toast slide-in, modal scale, skeleton shimmer) 추가

## Step 3: 공통 UI 컴포넌트 개선/신규
- [ ] `Button.tsx` — 그라디언트 primary, 호버 애니메이션, Lucide 아이콘 지원
- [ ] `Input.tsx` — 포커스 애니메이션, 에러 스타일 개선
- [ ] `Textarea.tsx` — 동일 스타일 개선
- [ ] `Card.tsx` — 그림자 강화, 호버 효과
- [ ] `Badge.tsx` — StatusBadge/PriorityBadge 컬러 개선
- [ ] `Toast.tsx` — 신규: 성공(3초 자동)/실패(X 버튼) 토스트 시스템
- [ ] `ToastProvider.tsx` — 신규: Context 기반 전역 토스트 관리
- [ ] `Modal.tsx` — 신규: 공통 모달 래퍼 (블러 배경, 애니메이션)
- [ ] `EmptyState.tsx` — 신규: SVG 일러스트 + 안내 문구 + 액션 버튼
- [ ] `Skeleton.tsx` — 신규: 스켈레톤 로딩 컴포넌트
- [ ] `ProgressBar.tsx` — 신규: AI 처리 중 단계별 진행 표시
- [ ] `index.ts` — export 업데이트

## Step 4: 레이아웃 컴포넌트 개선
- [ ] `Sidebar.tsx` — 접이식 사이드바 (인디고 그라디언트, 아이콘+텍스트, 모바일 드로어)
- [ ] `Header.tsx` — 사용자 정보, 역할 배지, 모바일 햄버거 메뉴
- [ ] `PageHeader.tsx` — 스타일 개선
- [ ] `(employee)/layout.tsx` — 임직원 테마 적용
- [ ] `(agent)/layout.tsx` — 처리자 테마 적용
- [ ] `(admin)/layout.tsx` — 관리자 테마 적용
- [ ] `app/layout.tsx` — ToastProvider 추가

## Step 5: 인증 페이지
- [ ] `(auth)/login/page.tsx` — 그라디언트 배경, 브랜드 강화, 입력 애니메이션

## Step 6: 임직원 페이지
- [ ] `(employee)/new-ticket/page.tsx` — AI 로딩 단계별 표시, 접수 완료 카드 개선
- [ ] `(employee)/my-tickets/page.tsx` — EmptyState, 스켈레톤, 카드 개선, 상태 필터
- [ ] `(employee)/my-tickets/[id]/page.tsx` — 메시지 버블, 하단 고정 입력창

## Step 7: 처리자 페이지
- [ ] `(agent)/queue/page.tsx` — 배지 개선, 스켈레톤, EmptyState
- [ ] `(agent)/tickets/page.tsx` — 배지 개선, 스켈레톤
- [ ] `(agent)/tickets/[id]/page.tsx` — 하단 고정 입력창, Modal 컴포넌트 적용, 메시지 버블

## Step 8: 관리자 페이지
- [ ] `(admin)/dashboard/page.tsx` — KPI 카드(파스텔+아이콘), Recharts 차트, 새로고침 버튼
- [ ] `(admin)/statistics/page.tsx` — Recharts 차트 강화
- [ ] `(admin)/all-tickets/page.tsx` — 테이블 스타일 개선
- [ ] `(admin)/users/page.tsx` — 테이블 스타일 개선
- [ ] `(admin)/settings/page.tsx` — 폼 스타일 개선

## Step 9: audit.md 업데이트 및 완료 처리
- [ ] audit.md 기록
- [ ] aidlc-state.md 수정 이력 업데이트

---

## 주의사항
- API/서비스 로직 변경 없음 (UI 레이어만)
- 기존 타입/인터페이스 유지
- 각 Step 완료 후 TypeScript 진단 확인
- alert() 전면 Toast로 교체
