import 'dotenv/config';
import { analyzeIntent, generateAnswer, transformToPublic } from '../src/services/ai.service';

async function main() {
  console.log('=== API 테스트 ===\n');

  // 1. analyzeIntent 테스트
  console.log('[1] analyzeIntent - VPN 관련 문의');
  const intent1 = await analyzeIntent('재택근무 중인데 VPN 연결이 안 됩니다. GlobalProtect에서 인증 실패 오류가 뜹니다.');
  console.log('  department:', intent1.intentResult.department);
  console.log('  team:', intent1.intentResult.team);
  console.log('  categories:', intent1.intentResult.categories);
  console.log('  duration:', intent1.usage.durationMs, 'ms\n');

  // 2. analyzeIntent 테스트 - ERP
  console.log('[2] analyzeIntent - ERP 관련 문의');
  const intent2 = await analyzeIntent('SAP에서 전표 입력 시 MIGO 오류가 발생합니다. 입고처리가 안 돼요.');
  console.log('  department:', intent2.intentResult.department);
  console.log('  team:', intent2.intentResult.team);
  console.log('  categories:', intent2.intentResult.categories);
  console.log('  duration:', intent2.usage.durationMs, 'ms\n');

  // 3. generateAnswer 테스트
  console.log('[3] generateAnswer - VPN 문의에 대한 답변 생성');
  const answer = await generateAnswer(
    '00000000-0000-0000-0000-000000000001',
    'VPN 접속이 안 됩니다. 비밀번호 변경 후 GlobalProtect에서 권한 없음 오류가 뜹니다.',
  );
  console.log('  confidence:', answer.confidence.toFixed(3));
  console.log('  model:', answer.modelUsed);
  console.log('  sources:', answer.sources.length, '건');
  console.log('  intent:', answer.intentResult.department, '/', answer.intentResult.team);
  console.log('  answer (first 200):', answer.answer.substring(0, 200));
  console.log('');

  // 4. transformToPublic 테스트
  console.log('[4] transformToPublic - Private → Public 변환');
  const { publicContent, usage } = await transformToPublic(
    '오지희 대리님, 해당 사용자 VPN 계정 잠금해제 처리했습니다. 비밀번호에 특수문자(<, >) 포함 여부 확인 후 변경 안내 부탁드립니다. SAP 접속도 같이 확인해주세요.',
  );
  console.log('  duration:', usage.durationMs, 'ms');
  console.log('  result:', publicContent);
  console.log('');

  console.log('=== 테스트 완료 ===');
  await (await import('../src/lib/prisma')).prisma.$disconnect();
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
