# UI 개선 요구사항 문서

**작성일**: 2026-05-15  
**유형**: 기능 개선 (POST Build-and-Test 미니 사이클)  
**범위**: 전체 화면 UI/UX 개선

---

## 1. 디자인 시스템

### 1.1 브랜드 컬러
- **Primary**: 보라/인디고 계열 (`indigo-600` 기준)
- **참고 이미지**: Dabang 대시보드 스타일 (그라디언트 사이드바, 컬러 KPI 카드)

### 1.2 역할별 테마 (완전 분리)
| 역할 | 테마 방향 | 액센트 컬러 |
|---|---|---|
| 임직원 (employee) | 친근하고 밝은 톤, 큰 버튼, 안내 문구 강화 | Indigo |
| 1차 처리자 (agent_l1) | 효율 중심, 정보 밀도 높음 | Violet |
| 2차 처리자 (agent_l2) | 효율 중심, 전문가 도구 느낌 | Purple |
| 관리자 (admin) | 데이터 중심, 대시보드 강조 | Indigo + 멀티컬러 KPI |

### 1.3 공통 디자인 원칙
- **모달/팝업**: 애니메이션(fade+scale), 배경 블러(`backdrop-blur`), 라운드 처리
- **카드**: 그림자 강화, 호버 효과, 라운드 처리
- **버튼**: 그라디언트 primary 버튼, 호버 애니메이션
- **아이콘**: Lucide React (이모지 전면 교체)
- **폰트**: 현재 Geist 유지

---

## 2. 레이아웃

### 2.1 사이드바
- **스타일**: 접이식 (기본: 아이콘만 표시 → hover/클릭 시 펼침)
- **배경**: 보라/인디고 그라디언트 (참고 이미지 스타일)
- **활성 메뉴**: 흰색 배경 + 인디고 텍스트 강조
- **모바일**: 오버레이 드로어 방식

### 2.2 반응형
- **완전 반응형**: 모바일(320px+) / 태블릿(768px+) / 데스크탑(1024px+)
- **모바일 사이드바**: 햄버거 메뉴 → 오버레이 드로어

### 2.3 헤더
- 현재 페이지 타이틀
- 우측: 사용자 정보 + 역할 배지

---

## 3. 페이지별 요구사항

### 3.1 로그인 페이지
- 중앙 정렬 카드, 브랜드 로고/타이틀 강화
- 배경: 인디고 그라디언트 또는 패턴
- 입력 필드 포커스 애니메이션

### 3.2 임직원 — 새 문의 (new-ticket)
- **AI 로딩 UX**: 단계별 진행 표시
  - AI 자동 응답 처리 중: "AI가 답변을 생성하고 있습니다..." + 프로그레스 바
  - 담당자 배정 대기: "담당자에게 전달 중입니다..." + 프로그레스 바
  - 기타 처리 중: "문의를 접수하고 있습니다..." + 프로그레스 바
- 접수 완료 후 AI 답변 카드: 강조된 스타일, 피드백 버튼 개선
- 친근한 안내 문구 강화

### 3.3 임직원 — 내 문의 목록 (my-tickets)
- **Empty State**: 일러스트(SVG) + "아직 문의가 없어요. 첫 문의를 접수해보세요!" + [문의하기] 버튼
- 티켓 카드: 상태별 컬러 강조, 호버 효과
- 필터/정렬 UI 추가 (상태별)

### 3.4 임직원 — 티켓 상세
- **메시지 입력창**: 하단 고정 (채팅 앱 스타일, `sticky bottom-0`)
- 메시지 버블 스타일 (요청자/AI/처리자 구분)

### 3.5 처리자 — 큐/티켓 목록 (agent_l1/l2)
- **우선순위 표시**: 배지 스타일 개선 (현재 방식 유지, 디자인만 개선)
- 대기 시간 표시 강화
- 빠른 액션 버튼 (목록에서 바로 처리 가능)

### 3.6 처리자 — 티켓 상세
- **메시지 입력창**: 하단 고정
- 분배/거절 모달: 현대적 스타일 (애니메이션, 블러)
- Private/Public 토글 시각적 강화

### 3.7 관리자 — 대시보드
- **KPI 카드**: 컬러풀한 파스텔 배경 + 아이콘 (참고 이미지 스타일)
- **차트 추가** (Recharts):
  - 티켓 상태별 도넛 차트
  - 기간별 티켓 추이 라인 차트
  - AI 해결률 트렌드
- **수동 새로고침 버튼**: 우측 상단
- 최근 티켓 목록 테이블

### 3.8 관리자 — 통계 페이지
- Recharts 기반 차트 강화
- LLM 비용 시각화

---

## 4. 공통 UX 컴포넌트

### 4.1 토스트 알림 시스템
- **성공**: 초록색, 3초 후 자동 사라짐
- **실패/에러**: 빨간색, X 버튼으로만 닫힘 (자동 사라지지 않음)
- **정보**: 파란색, 3초 후 자동 사라짐
- 위치: 화면 우측 상단
- 애니메이션: slide-in + fade-out

### 4.2 Empty State 컴포넌트
- SVG 일러스트 + 안내 문구 + 액션 버튼
- 역할/상황별 메시지 커스터마이징

### 4.3 로딩 상태
- 스켈레톤 UI (목록 페이지)
- 프로그레스 바 (AI 처리 중)
- 스피너 (버튼 액션)

### 4.4 모달/다이얼로그
- `backdrop-blur-sm` 배경
- `scale` + `opacity` 애니메이션
- 라운드 처리 (`rounded-2xl`)
- ESC 키 닫기 지원

---

## 5. 신규 패키지

| 패키지 | 용도 | 버전 |
|---|---|---|
| `lucide-react` | 아이콘 라이브러리 | latest |
| `recharts` | 차트/데이터 시각화 | latest |

---

## 6. 적용 범위 및 파일 목록

### 디자인 시스템 (신규/수정)
- `src/components/ui/` — 전체 컴포넌트 개선
- `src/components/ui/Toast.tsx` — 신규
- `src/components/ui/EmptyState.tsx` — 신규
- `src/components/ui/Skeleton.tsx` — 신규
- `src/components/ui/Modal.tsx` — 신규 (공통 모달 래퍼)
- `src/components/ui/ProgressBar.tsx` — 신규
- `src/app/globals.css` — CSS 변수, 애니메이션 추가

### 레이아웃
- `src/components/layout/` — 사이드바, 헤더 전면 개선
- `src/app/(employee)/layout.tsx`
- `src/app/(agent)/layout.tsx`
- `src/app/(admin)/layout.tsx`
- `src/app/(auth)/login/page.tsx`

### 페이지 (전체)
- `src/app/(employee)/new-ticket/page.tsx`
- `src/app/(employee)/my-tickets/page.tsx`
- `src/app/(employee)/my-tickets/[id]/page.tsx`
- `src/app/(agent)/queue/page.tsx`
- `src/app/(agent)/tickets/page.tsx`
- `src/app/(agent)/tickets/[id]/page.tsx`
- `src/app/(admin)/dashboard/page.tsx`
- `src/app/(admin)/statistics/page.tsx`
- `src/app/(admin)/all-tickets/page.tsx`
- `src/app/(admin)/users/page.tsx`
- `src/app/(admin)/settings/page.tsx`

---

## 7. 비기능 요구사항

- 기존 API/서비스 로직 변경 없음 (UI 레이어만 수정)
- 접근성: ARIA 레이블, 키보드 네비게이션 유지
- 성능: 불필요한 리렌더링 방지 (컴포넌트 분리)
