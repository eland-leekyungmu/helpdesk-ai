#!/usr/bin/env ts-node
/**
 * 시드 데이터 1건 생성 테스트
 * 실행: npx ts-node --project tsconfig.json scripts/data-pipeline/test-single.ts
 */

import 'dotenv/config';
import { invokeModel } from '../../src/lib/bedrock';

async function main() {
  console.log('=== 시드 데이터 1건 생성 테스트 ===\n');
  console.log('Region:', process.env.AWS_REGION);
  console.log('Model:', process.env.BEDROCK_MODEL_LIGHTWEIGHT);
  console.log('');

  const prompt = `당신은 IT Help Desk 데이터 생성 전문가입니다.
아래 카테고리에 해당하는 IT 문의-답변 데이터를 1건 생성하세요.

[카테고리] 네트워크
[담당 부서] 인프라보안부서
[담당 팀] 네트워크팀

규칙:
- 실제 기업 IT Help Desk에서 나올 법한 현실적인 문의
- 질문은 자연스러운 구어체
- 답변은 구체적이고 실행 가능한 안내

다음 JSON 배열 형식으로만 응답하세요:
[
  {"question": "질문 내용", "answer": "답변 내용"}
]`;

  try {
    const response = await invokeModel({
      prompt,
      modelType: 'lightweight',
      maxTokens: 1024,
      temperature: 0.7,
    });

    console.log('--- LLM 응답 ---');
    console.log('Model:', response.modelId);
    console.log('Input tokens:', response.inputTokens);
    console.log('Output tokens:', response.outputTokens);
    console.log('Duration:', response.durationMs, 'ms');
    console.log('');
    console.log('--- 생성된 데이터 ---');
    console.log(response.content);
    console.log('');

    // JSON 파싱 시도
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('--- 파싱 결과 ---');
      console.log(JSON.stringify(parsed, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
