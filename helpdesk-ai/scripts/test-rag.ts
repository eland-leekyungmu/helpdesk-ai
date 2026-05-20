import 'dotenv/config';
import { retrieveFromKB, invokeModel } from '../src/lib/bedrock';

async function main() {
  const question = 'VPN 접속이 안 됩니다';

  // 1. KB 검색 테스트 (필터 없이)
  console.log('[1] KB 검색 (필터 없이)');
  try {
    const results = await retrieveFromKB({ query: question, topK: 5 });
    console.log(`  결과: ${results.length}건`);
    results.forEach((r, i) => {
      console.log(`  [${i + 1}] score=${r.score.toFixed(3)} | ${r.content.substring(0, 80)}...`);
      console.log(`       metadata: ${JSON.stringify(r.metadata)}`);
    });
  } catch (error) {
    console.error('  ❌ KB 검색 실패:', error instanceof Error ? error.message : error);
  }

  console.log('');

  // 2. KB 검색 테스트 (필터 있음)
  console.log('[2] KB 검색 (department=인프라보안부서 필터)');
  try {
    const results = await retrieveFromKB({
      query: question,
      topK: 5,
      filter: { department: '인프라보안부서' },
    });
    console.log(`  결과: ${results.length}건`);
    results.forEach((r, i) => {
      console.log(`  [${i + 1}] score=${r.score.toFixed(3)} | ${r.content.substring(0, 80)}...`);
    });
  } catch (error) {
    console.error('  ❌ KB 검색 (필터) 실패:', error instanceof Error ? error.message : error);
  }

  console.log('');

  // 3. LLM 호출 테스트
  console.log('[3] LLM 호출 테스트');
  try {
    const resp = await invokeModel({ prompt: '안녕하세요. 테스트입니다. "OK"라고만 답하세요.', modelType: 'lightweight', maxTokens: 50 });
    console.log(`  응답: ${resp.content}`);
    console.log(`  duration: ${resp.durationMs}ms`);
  } catch (error) {
    console.error('  ❌ LLM 호출 실패:', error instanceof Error ? error.message : error);
  }
}

main().catch(e => console.error('Fatal:', e));
