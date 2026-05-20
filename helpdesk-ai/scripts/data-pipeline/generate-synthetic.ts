#!/usr/bin/env ts-node
// ============================================================
// 합성 데이터 생성 배치 스크립트
// 실행: npx ts-node scripts/data-pipeline/generate-synthetic.ts
// ============================================================

import 'dotenv/config';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import {
  generateSeedData,
  loadSourceData,
  generateSynthetic,
  type SourceData,
} from '@/services/data-pipeline.service';

async function main() {
  const args = process.argv.slice(2);
  const targetCount = parseInt(args[0] || '100000', 10);
  const outputPath = args[1] || resolve(__dirname, '../../data/synthetic-output.json');
  const sourcePath = args[2]; // optional: 소스 데이터 경로

  console.log('=== 합성 데이터 생성 시작 ===');
  console.log(`목표 건수: ${targetCount.toLocaleString()}`);
  console.log(`출력 경로: ${outputPath}`);
  console.log('');

  let sourceData: SourceData[];

  if (sourcePath) {
    // 소스 데이터가 있으면 로드
    console.log(`소스 데이터 로드: ${sourcePath}`);
    sourceData = await loadSourceData(sourcePath);
    console.log(`소스 데이터: ${sourceData.length}건 로드 완료`);
  } else {
    // 소스 데이터 없으면 시드 생성
    console.log('소스 데이터 없음 → 시드 데이터 생성 시작');
    const seedEntries = await generateSeedData({ entriesPerCategory: 22 });
    console.log(`시드 데이터: ${seedEntries.length}건 생성 완료`);

    sourceData = seedEntries.map((e) => ({
      question: e.question,
      answer: e.answer,
      category: e.category,
      department: e.department,
      team: e.team,
    }));

    // 시드 데이터 저장
    const seedPath = resolve(__dirname, '../../data/seed-data.json');
    await writeFile(seedPath, JSON.stringify(sourceData, null, 2), 'utf-8');
    console.log(`시드 데이터 저장: ${seedPath}`);
  }

  console.log('');
  console.log('=== 합성 데이터 확장 시작 ===');

  const syntheticEntries = await generateSynthetic(sourceData, {
    count: targetCount,
    batchSize: 10,
  });

  // 결과 저장
  await writeFile(outputPath, JSON.stringify(syntheticEntries, null, 2), 'utf-8');

  console.log('');
  console.log('=== 완료 ===');
  console.log(`생성 건수: ${syntheticEntries.length.toLocaleString()}`);
  console.log(`저장 경로: ${outputPath}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
