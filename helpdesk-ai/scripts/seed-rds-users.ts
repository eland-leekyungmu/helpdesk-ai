import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

// bcrypt hash for "Test1234!" - pre-computed to avoid bcrypt dependency in script
const DEFAULT_PASSWORD_HASH = '$2b$10$xJ8Kq3Q5Z5Z5Z5Z5Z5Z5ZuZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z';

async function main() {
  console.log('=== RDS 사용자 데이터 적재 시작 ===\n');

  // ─── 1. 법인 (organizations) ───────────────────────────────
  console.log('[1/6] 법인 생성...');
  const orgs = await Promise.all([
    upsertOrg('이랜드이노플', 'EINOPLE'),
    upsertOrg('이랜드이츠', 'EATS'),
    upsertOrg('이랜드리테일', 'RETAIL'),
    upsertOrg('이랜드월드', 'WORLD'),
    upsertOrg('이랜드파크', 'PARK'),
    upsertOrg('중국이랜드패션', 'CN_FASHION'),
  ]);
  const orgMap = Object.fromEntries(orgs.map(o => [o.code, o.id]));
  console.log(`  → ${orgs.length}개 법인 완료\n`);

  // ─── 2. 부서 (departments) ─────────────────────────────────
  console.log('[2/6] 부서 생성...');

  // 이랜드이노플 부서
  const innopleDepts = await Promise.all([
    upsertDept(orgMap['EINOPLE'], 'IT개발부서', 'DEV'),
    upsertDept(orgMap['EINOPLE'], '인프라보안부서', 'INFRA'),
    upsertDept(orgMap['EINOPLE'], '데이터플랫폼부서', 'DATA'),
    upsertDept(orgMap['EINOPLE'], '시스템운영부서', 'OPS'),
    upsertDept(orgMap['EINOPLE'], '경영지원부서', 'BIZ'),
    upsertDept(orgMap['EINOPLE'], '인사부서', 'HR'),
    upsertDept(orgMap['EINOPLE'], '재무부서', 'FIN'),
    upsertDept(orgMap['EINOPLE'], '홍보부서', 'PR'),
    upsertDept(orgMap['EINOPLE'], 'ITHelpDesk부서', 'HELPDESK'),
  ]);

  // 요청자 소속 법인 부서
  const otherDepts = await Promise.all([
    upsertDept(orgMap['EATS'], '외식사업부', 'EATS_BIZ'),
    upsertDept(orgMap['RETAIL'], '영업부', 'RETAIL_SALES'),
    upsertDept(orgMap['WORLD'], '사업부', 'WORLD_BIZ'),
    upsertDept(orgMap['PARK'], '운영부', 'PARK_OPS'),
    upsertDept(orgMap['CN_FASHION'], 'IT부', 'CN_IT'),
  ]);

  const allDepts = [...innopleDepts, ...otherDepts];
  const deptMap = Object.fromEntries(allDepts.map(d => [d.code, d.id]));
  console.log(`  → ${allDepts.length}개 부서 완료\n`);

  // ─── 3. 팀 (teams) ─────────────────────────────────────────
  console.log('[3/6] 팀 생성...');

  const teamData: Array<{ deptCode: string; name: string; code: string }> = [
    // 이랜드이노플
    { deptCode: 'DEV', name: '개발3팀', code: 'DEV3' },
    { deptCode: 'DEV', name: 'ERP팀', code: 'DEV_ERP' },
    { deptCode: 'DEV', name: 'CRM팀', code: 'DEV_CRM' },
    { deptCode: 'INFRA', name: '클라우드팀', code: 'CLOUD' },
    { deptCode: 'INFRA', name: '네트워크팀', code: 'NET' },
    { deptCode: 'INFRA', name: '정보인프라팀', code: 'INFRA_SYS' },
    { deptCode: 'INFRA', name: '정보보안팀', code: 'SEC' },
    { deptCode: 'DATA', name: '데이터플랫폼팀', code: 'DP' },
    { deptCode: 'DATA', name: 'AX혁신팀', code: 'AX' },
    { deptCode: 'DATA', name: 'BI팀', code: 'BI' },
    { deptCode: 'DATA', name: '데이터사이언스팀', code: 'DS' },
    { deptCode: 'OPS', name: '그룹웨어팀', code: 'GW' },
    { deptCode: 'OPS', name: 'SCM팀', code: 'SCM' },
    { deptCode: 'OPS', name: 'FCM팀', code: 'FCM' },
    { deptCode: 'OPS', name: 'ERP팀', code: 'OPS_ERP' },
    { deptCode: 'OPS', name: 'CRM팀', code: 'OPS_CRM' },
    { deptCode: 'BIZ', name: '기획팀', code: 'PLAN' },
    { deptCode: 'BIZ', name: '경영지원팀', code: 'SUPPORT' },
    { deptCode: 'HR', name: 'HR팀', code: 'HR_MAIN' },
    { deptCode: 'HR', name: '인사총무팀', code: 'HR_GA' },
    { deptCode: 'FIN', name: '재무팀', code: 'FIN_MAIN' },
    { deptCode: 'FIN', name: '세무행정팀', code: 'TAX' },
    { deptCode: 'PR', name: '홍보마케팅팀', code: 'PR_MKT' },
    { deptCode: 'HELPDESK', name: 'ITHelpDesk팀', code: 'HELPDESK_TEAM' },
    // 요청자 소속
    { deptCode: 'EATS_BIZ', name: '외식사업팀', code: 'EATS_TEAM' },
    { deptCode: 'RETAIL_SALES', name: '영업팀', code: 'RETAIL_TEAM' },
    { deptCode: 'WORLD_BIZ', name: '사업팀', code: 'WORLD_TEAM' },
    { deptCode: 'PARK_OPS', name: '운영팀', code: 'PARK_TEAM' },
    { deptCode: 'CN_IT', name: 'IT팀', code: 'CN_IT_TEAM' },
  ];

  const teams = await Promise.all(
    teamData.map(t => upsertTeam(deptMap[t.deptCode], t.name, t.code))
  );
  const teamMap = Object.fromEntries(teams.map(t => [t.code, t.id]));
  console.log(`  → ${teams.length}개 팀 완료\n`);

  // ─── 4. 2차 처리자 (agent_l2) ──────────────────────────────
  console.log('[4/6] 2차 처리자 생성...');
  const l2Users: Array<{ name: string; email: string; teamCode: string }> = [
    { name: '정우진', email: 'jung_woojin@elandinnople.com', teamCode: 'DEV3' },
    { name: '한서연', email: 'han_seoyeon@elandinnople.com', teamCode: 'DEV3' },
    { name: '김민주', email: 'kim_minju@elandinnople.com', teamCode: 'DEV_ERP' },
    { name: '이성일', email: 'lee_sungil@elandinnople.com', teamCode: 'DEV_ERP' },
    { name: '박준혁', email: 'park_junhyuk@elandinnople.com', teamCode: 'DEV_ERP' },
    { name: '김대한', email: 'kim_daehan@elandinnople.com', teamCode: 'DEV_CRM' },
    { name: '송지원', email: 'song_jiwon@elandinnople.com', teamCode: 'DEV_CRM' },
    { name: '최동현', email: 'choi_donghyun@elandinnople.com', teamCode: 'CLOUD' },
    { name: '윤하늘', email: 'yoon_haneul@elandinnople.com', teamCode: 'CLOUD' },
    { name: '강태우', email: 'kang_taewoo@elandinnople.com', teamCode: 'NET' },
    { name: '임수빈', email: 'lim_subin@elandinnople.com', teamCode: 'NET' },
    { name: '조현우', email: 'cho_hyunwoo@elandinnople.com', teamCode: 'INFRA_SYS' },
    { name: '배소영', email: 'bae_soyoung@elandinnople.com', teamCode: 'INFRA_SYS' },
    { name: '오지희', email: 'oh_jihee@elandinnople.com', teamCode: 'SEC' },
    { name: '신동민', email: 'shin_dongmin@elandinnople.com', teamCode: 'SEC' },
    { name: '류지훈', email: 'ryu_jihoon@elandinnople.com', teamCode: 'DP' },
    { name: '문채원', email: 'moon_chaewon@elandinnople.com', teamCode: 'DP' },
    { name: '황인호', email: 'hwang_inho@elandinnople.com', teamCode: 'AX' },
    { name: '서민재', email: 'seo_minjae@elandinnople.com', teamCode: 'BI' },
    { name: '장유진', email: 'jang_yujin@elandinnople.com', teamCode: 'BI' },
    { name: '권도윤', email: 'kwon_doyoon@elandinnople.com', teamCode: 'DS' },
    { name: '나현정', email: 'na_hyunjung@elandinnople.com', teamCode: 'GW' },
    { name: '고승우', email: 'ko_seungwoo@elandinnople.com', teamCode: 'GW' },
    { name: '양지호', email: 'yang_jiho@elandinnople.com', teamCode: 'SCM' },
    { name: '전미래', email: 'jeon_mirae@elandinnople.com', teamCode: 'SCM' },
    { name: '탁동완', email: 'tak_dongwan@elandinnople.com', teamCode: 'FCM' },
    { name: '김동상', email: 'kim_dongsang@elandinnople.com', teamCode: 'FCM' },
    { name: '이재훈', email: 'lee_jaehoon@elandinnople.com', teamCode: 'OPS_ERP' },
    { name: '박서진', email: 'park_seojin@elandinnople.com', teamCode: 'OPS_CRM' },
    { name: '유승환', email: 'yoo_seunghwan@elandinnople.com', teamCode: 'PLAN' },
    { name: '홍지수', email: 'hong_jisoo@elandinnople.com', teamCode: 'SUPPORT' },
    { name: '안소희', email: 'ahn_sohee@elandinnople.com', teamCode: 'HR_MAIN' },
    { name: '손태영', email: 'son_taeyoung@elandinnople.com', teamCode: 'HR_GA' },
    { name: '차민석', email: 'cha_minseok@elandinnople.com', teamCode: 'FIN_MAIN' },
    { name: '구자영', email: 'koo_jayoung@elandinnople.com', teamCode: 'TAX' },
    { name: '백수연', email: 'baek_sooyeon@elandinnople.com', teamCode: 'PR_MKT' },
  ];

  let l2Count = 0;
  for (const u of l2Users) {
    await upsertUser(u.email, u.name, 'agent_l2', teamMap[u.teamCode]);
    l2Count++;
  }
  console.log(`  → ${l2Count}명 완료\n`);

  // ─── 5. 1차 처리자 (agent_l1) ──────────────────────────────
  console.log('[5/6] 1차 처리자 생성...');
  const l1Users = [
    { name: '김보경', email: 'kim_bokyeong@eland-partner.co.kr' },
    { name: '이찬욱', email: 'lee_chanwook@eland-partner.co.kr' },
    { name: '최현진', email: 'choi_hyunjin@eland-partner.co.kr' },
    { name: '강동호', email: 'kang_dongho@eland-partner.co.kr' },
  ];

  for (const u of l1Users) {
    await upsertUser(u.email, u.name, 'agent_l1', teamMap['HELPDESK_TEAM']);
  }
  console.log(`  → ${l1Users.length}명 완료\n`);

  // ─── 6. 요청자 (employee) ──────────────────────────────────
  console.log('[6/6] 요청자 생성...');
  const employees: Array<{ name: string; email: string; teamCode: string }> = [
    { name: '박아란', email: 'park_aran@eland.co.kr', teamCode: 'EATS_TEAM' },
    { name: '송하은', email: 'song_haeun@eland.co.kr', teamCode: 'EATS_TEAM' },
    { name: '임도연', email: 'lim_doyeon@eland.co.kr', teamCode: 'EATS_TEAM' },
    { name: '박은경', email: 'park_eunkyung@eland.co.kr', teamCode: 'RETAIL_TEAM' },
    { name: '이화성', email: 'lee_hwasung@eland.co.kr', teamCode: 'RETAIL_TEAM' },
    { name: '이승엽', email: 'lee_seongyeob@eland.co.kr', teamCode: 'RETAIL_TEAM' },
    { name: '이수형', email: 'lee_soohyung@eland.co.kr', teamCode: 'RETAIL_TEAM' },
    { name: '차상민', email: 'cha_sangmin@eland.co.kr', teamCode: 'RETAIL_TEAM' },
    { name: '정민호', email: 'jung_minho@eland.co.kr', teamCode: 'RETAIL_TEAM' },
    { name: '배진우', email: 'bae_jinwoo@eland.co.kr', teamCode: 'RETAIL_TEAM' },
    { name: '신유라', email: 'shin_yura@eland.co.kr', teamCode: 'RETAIL_TEAM' },
    { name: '허소정', email: 'heo_sojeong@eland.co.kr', teamCode: 'WORLD_TEAM' },
    { name: '김지현', email: 'kim_jihyun@eland.co.kr', teamCode: 'WORLD_TEAM' },
    { name: '윤재석', email: 'yoon_jaeseok@eland.co.kr', teamCode: 'WORLD_TEAM' },
    { name: '한예진', email: 'han_yejin@eland.co.kr', teamCode: 'WORLD_TEAM' },
    { name: '조은서', email: 'cho_eunseo@eland.co.kr', teamCode: 'WORLD_TEAM' },
    { name: '오세덕', email: 'oh_seadeok@eland.co.kr', teamCode: 'PARK_TEAM' },
    { name: '노승현', email: 'noh_seunghyun@eland.co.kr', teamCode: 'PARK_TEAM' },
    { name: '마위팅', email: 'ma_yuting@elandfashion.cn', teamCode: 'CN_IT_TEAM' },
    { name: '왕지', email: 'wang_ji@elandfashion.cn', teamCode: 'CN_IT_TEAM' },
  ];

  let empCount = 0;
  for (const u of employees) {
    await upsertUser(u.email, u.name, 'employee', teamMap[u.teamCode]);
    empCount++;
  }
  console.log(`  → ${empCount}명 완료\n`);

  console.log('=== 적재 완료 ===');
  await prisma.$disconnect();
}

// ─── 헬퍼 함수 ─────────────────────────────────────────────

async function upsertOrg(name: string, code: string) {
  const existing = await prisma.organization.findFirst({ where: { code } });
  if (existing) return existing;
  return prisma.organization.create({ data: { name, code } });
}

async function upsertDept(organizationId: string, name: string, code: string) {
  const existing = await prisma.department.findFirst({ where: { organizationId, code } });
  if (existing) return existing;
  return prisma.department.create({ data: { organizationId, name, code } });
}

async function upsertTeam(departmentId: string, name: string, code: string) {
  const existing = await prisma.team.findFirst({ where: { departmentId, code } });
  if (existing) return existing;
  return prisma.team.create({ data: { departmentId, name, code } });
}

async function upsertUser(email: string, name: string, role: 'employee' | 'agent_l1' | 'agent_l2', teamId: string) {
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: { email, name, role, teamId, passwordHash: DEFAULT_PASSWORD_HASH },
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
