// ============================================================
// 카테고리 및 조직 구조 상수
// 소유 유닛: Unit 3 (AI/RAG) — 공유 참조
// ============================================================

/** 사전 정의 카테고리 목록 (closed set, 22개) */
export const CATEGORIES = [
  '웹/앱 개발',
  'ERP 시스템',
  'CRM 시스템',
  '클라우드 인프라',
  '네트워크',
  'IT 인프라 (서버/스토리지)',
  '정보보안',
  '데이터/분석 플랫폼',
  'AX/업무혁신',
  'BI/리포트',
  '데이터사이언스/AI',
  '그룹웨어 (메일/캘린더/결재)',
  'SCM (공급망)',
  'FCM (매장관리)',
  '경영기획 시스템',
  '경영지원 시스템',
  'HR/인사 시스템',
  '인사/총무',
  '재무/회계 시스템',
  '세무/행정',
  '홍보/마케팅 시스템',
  '계정/권한 관리',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** 조직 구조 (이랜드이노플) */
export const ORGANIZATION_STRUCTURE = [
  { department: 'IT개발부서', teams: ['개발3팀', 'ERP팀', 'CRM팀'] },
  { department: '인프라보안부서', teams: ['클라우드팀', '네트워크팀', '정보인프라팀', '정보보안팀'] },
  { department: '데이터플랫폼부서', teams: ['데이터플랫폼팀', 'AX혁신팀', 'BI팀', '데이터사이언스팀'] },
  { department: '시스템운영부서', teams: ['그룹웨어팀', 'SCM팀', 'FCM팀', 'ERP팀', 'CRM팀'] },
  { department: '경영지원부서', teams: ['기획팀', '경영지원팀'] },
  { department: '인사부서', teams: ['HR팀', '인사총무팀'] },
  { department: '재무부서', teams: ['재무팀', '세무행정팀'] },
  { department: '홍보부서', teams: ['홍보마케팅팀'] },
] as const;

/** 카테고리 → 팀 매핑 */
export const CATEGORY_TEAM_MAP: Record<string, { department: string; team: string }> = {
  '웹/앱 개발': { department: 'IT개발부서', team: '개발3팀' },
  'ERP 시스템': { department: 'IT개발부서', team: 'ERP팀' },
  'CRM 시스템': { department: 'IT개발부서', team: 'CRM팀' },
  '클라우드 인프라': { department: '인프라보안부서', team: '클라우드팀' },
  '네트워크': { department: '인프라보안부서', team: '네트워크팀' },
  'IT 인프라 (서버/스토리지)': { department: '인프라보안부서', team: '정보인프라팀' },
  '정보보안': { department: '인프라보안부서', team: '정보보안팀' },
  '데이터/분석 플랫폼': { department: '데이터플랫폼부서', team: '데이터플랫폼팀' },
  'AX/업무혁신': { department: '데이터플랫폼부서', team: 'AX혁신팀' },
  'BI/리포트': { department: '데이터플랫폼부서', team: 'BI팀' },
  '데이터사이언스/AI': { department: '데이터플랫폼부서', team: '데이터사이언스팀' },
  '그룹웨어 (메일/캘린더/결재)': { department: '시스템운영부서', team: '그룹웨어팀' },
  'SCM (공급망)': { department: '시스템운영부서', team: 'SCM팀' },
  'FCM (매장관리)': { department: '시스템운영부서', team: 'FCM팀' },
  '경영기획 시스템': { department: '경영지원부서', team: '기획팀' },
  '경영지원 시스템': { department: '경영지원부서', team: '경영지원팀' },
  'HR/인사 시스템': { department: '인사부서', team: 'HR팀' },
  '인사/총무': { department: '인사부서', team: '인사총무팀' },
  '재무/회계 시스템': { department: '재무부서', team: '재무팀' },
  '세무/행정': { department: '재무부서', team: '세무행정팀' },
  '홍보/마케팅 시스템': { department: '홍보부서', team: '홍보마케팅팀' },
  '계정/권한 관리': { department: '', team: '' }, // 1차 처리자 판단
  '기타': { department: '', team: '' }, // 1차 처리자 큐 — 제거됨 (하위 호환용)
};
