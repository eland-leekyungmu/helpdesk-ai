#!/usr/bin/env ts-node
// ============================================================
// 합성 데이터 품질 검증 + KB 적재 스크립트
// 실행: npx ts-node scripts/data-pipeline/validate-and-load.ts [input-path]
// ============================================================

import 'dotenv/config';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { validateQuality, loadToKB } from '@/services/data-pipeline.service';
import { type SyntheticEntry } from '@/shared/types/ai';

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || resolve(__dirname, '../../data/synthetic-output.json');

  console.log('=== 품질 검증 + KB 적재 시작 ===');
  console.log(`입력 파일: ${inputPath}`);
  console.log('');

  // 1. 데이터 로드
  console.log('[Step 1] 데이터 로드...');
  const raw = await readFile(inputPath, 'utf-8');
  const entries: SyntheticEntry[] = JSON.parse(raw);
  console.log(`로드 완료: ${entries.length.toLocaleString()}건`);
  console.log('');

  // 2. 품질 검증
  console.log('[Step 2] 품질 검증...');
  const validationResult = validateQuality(entries);

  console.log(`  총 입력: ${validationResult.totalInput.toLocaleString()}건`);
  console.log(`  통과: ${validationResult.passed.toLocaleString()}건`);
  console.log(`  중복 제거: ${validationResult.duplicatesRemoved.toLocaleString()}건`);
  console.log(`  형식 오류: ${validationResult.invalidFormat.toLocaleString()}건`);
  console.log(`  통과율: ${((validationResult.passed / validationResult.totalInput) * 100).toFixed(1)}%`);
  console.log('');

  // 3. KB 적재
  console.log('[Step 3] KB 적재...');
  const loadResult = await loadToKB(validationResult.entries);

  console.log(`  적재 성공: ${loadResult.totalLoaded.toLocaleString()}건`);
  console.log(`  적재 실패: ${loadResult.failed.toLocaleString()}건`);
  if (loadResult.errors.length > 0) {
    console.log('  에러 목록:');
    loadResult.errors.forEach((e) => console.log(`    - ${e}`));
  }
  console.log('');

  // 4. 결과 리포트
  console.log('=== 최종 리포트 ===');
  console.log(`입력: ${entries.length.toLocaleString()}건`);
  console.log(`검증 통과: ${validationResult.passed.toLocaleString()}건`);
  console.log(`KB 적재: ${loadResult.totalLoaded.toLocaleString()}건`);
  console.log(`최종 성공률: ${((loadResult.totalLoaded / entries.length) * 100).toFixed(1)}%`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
