import 'dotenv/config';
import { invokeModel } from '../../src/lib/bedrock';

async function main() {
  const prompt = `당신은 이랜드 그룹 IT Help Desk의 실제 티켓 데이터를 생성하는 전문가입니다.

[배경]
- 이랜드 그룹은 패션, 유통, 외식, 레저 등 다양한 사업을 운영하는 대기업입니다
- IT Help Desk에는 임직원과 매장 직원들이 IT 관련 문의를 접수합니다
- 1차 처리자(서비스데스크)가 접수 후, 필요시 2차 처리자(전문 담당팀)에게 확인 요청합니다

[생성 조건]
- 카테고리: 네트워크
- 담당 부서: 인프라보안부서
- 담당 팀: 네트워크팀
- 업무 컨텍스트: 사내 네트워크, VPN, 와이파이 관련 문의

[데이터 형식]
각 항목은 실제 티켓의 "질문(요청자 문의)"과 "답변(최종 요청자에게 전달된 답변)"으로 구성됩니다.

규칙:
1. question: 요청자가 실제로 작성할 법한 자연스러운 문의 (구어체 OK)
2. answer: 1차 처리자가 요청자에게 전달하는 최종 답변 (정중하고 구체적인 안내)
3. subject: 티켓 제목 (간결하게)
4. tags: 관련 태그 2~4개
5. 이랜드 그룹의 실제 시스템명을 자연스럽게 사용

1건을 아래 JSON 배열로만 응답하세요:
[
  {
    "subject": "티켓 제목",
    "question": "요청자 문의 내용",
    "answer": "최종 답변 내용",
    "tags": ["태그1", "태그2"]
  }
]`;

  const response = await invokeModel({
    prompt,
    modelType: 'lightweight',
    maxTokens: 2048,
    temperature: 0.7,
  });

  console.log('Duration:', response.durationMs, 'ms');
  console.log('Tokens:', response.inputTokens, '→', response.outputTokens);
  console.log('');

  // 파싱
  const cleaned = response.content.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    const entry = {
      ...parsed[0],
      category: '네트워크',
      department: '인프라보안부서',
      team: '네트워크팀',
    };
    console.log(JSON.stringify(entry, null, 2));
  } else {
    console.log('Raw:', response.content);
  }
}

main().catch(e => console.error(e));
