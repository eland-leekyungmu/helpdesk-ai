import 'dotenv/config';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

async function main() {
  const prompt = `IT Help Desk 티켓 1건. [1차-단순문의] 비밀번호 초기화
요청자:박아란(이랜드이츠) 1차:김보경
카테고리:정보보안|VPN계정,문서보안
JSON한줄(줄바꿈은\\n): {"subject":"제목","question":"문의","answer":"답변","tags":["태그"]}`;

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 500,
    temperature: 0.8,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const resp = await client.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(body),
    }));

    const result = JSON.parse(new TextDecoder().decode(resp.body));
    console.log('=== RAW RESPONSE ===');
    console.log(result.content[0].text);
    console.log('\n=== PARSE ATTEMPT ===');

    const content = result.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('SUCCESS:', JSON.stringify(parsed, null, 2));
      } catch {
        const fixed = jsonMatch[0].replace(/\r\n/g, '\\n').replace(/\n/g, '\\n');
        try {
          const parsed = JSON.parse(fixed);
          console.log('SUCCESS (fixed):', JSON.stringify(parsed, null, 2));
        } catch (e2) {
          console.log('FAIL:', (e2 as Error).message);
          console.log('RAW JSON:', jsonMatch[0].substring(0, 300));
        }
      }
    } else {
      console.log('NO JSON MATCH');
    }
  } catch (e) {
    console.error('API ERROR:', (e as Error).message);
  }
}

main();
