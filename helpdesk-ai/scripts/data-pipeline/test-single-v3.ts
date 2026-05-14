import 'dotenv/config';
import { invokeModel } from '../../src/lib/bedrock';

async function main() {
  const prompt = `당신은 이랜드 그룹 IT Help Desk의 실제 티켓 데이터를 생성하는 전문가입니다.

[배경]
- 이랜드 그룹 IT Help Desk에는 임직원이 IT 문의를 접수합니다
- 1차 처리자(ITHelpDesk팀)가 접수하여 직접 답변하거나, 2차 처리자(전문 담당팀)에게 확인 요청합니다
- 2차 처리자가 답변하면 1차 처리자가 확인 후 요청자에게 전달합니다

[시나리오: 2차 처리자 이관 후 해결 (l2_resolved)]

[등장인물]
- 요청자: 박아란 (park_aran@eland.co.kr, 이랜드이츠, 외식사업부, 파트장)
- 1차 처리자: 김보경 (kim_bokyeong@eland-partner.co.kr, ITHelpDesk팀)
- 2차 처리자: 김민주 (kim_minju@elandinnople.com, IT개발부서, ERP팀)

[생성 조건]
- 카테고리: ERP 시스템
- 담당 부서: IT개발부서
- 담당 팀: ERP팀

규칙:
1. question: 요청자(박아란)가 실제로 작성할 법한 자연스러운 문의
2. answer: 1차 처리자(김보경)가 2차 처리자(김민주)의 답변을 받아 요청자에게 전달하는 최종 답변
3. internal_note: 1차→2차 이관 시 내부 메모 (요청자에게 비공개)
4. l2_response: 2차 처리자(김민주)가 1차 처리자에게 보낸 답변 (요청자에게 비공개)
5. subject: 티켓 제목
6. tags: 관련 태그 2~4개
7. 이랜드 그룹의 실제 시스템명(SAP, 에프원 등)을 자연스럽게 사용

1건을 아래 JSON으로만 응답하세요:
{
  "subject": "티켓 제목",
  "question": "요청자 문의 내용",
  "internal_note": "1차 처리자가 2차 처리자에게 보낸 내부 메모",
  "l2_response": "2차 처리자의 답변 (내부)",
  "answer": "1차 처리자가 요청자에게 전달한 최종 답변",
  "tags": ["태그1", "태그2"]
}`;

  const response = await invokeModel({
    prompt,
    modelType: 'lightweight',
    maxTokens: 2048,
    temperature: 0.7,
  });

  console.log('Duration:', response.durationMs, 'ms');
  console.log('');

  const cleaned = response.content.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    const entry = {
      ...parsed,
      category: 'ERP 시스템',
      department: 'IT개발부서',
      team: 'ERP팀',
      resolution_type: 'l2_resolved',
      requester: { name: '박아란', email: 'park_aran@eland.co.kr', company: '이랜드이츠' },
      agent_l1: { name: '김보경', email: 'kim_bokyeong@eland-partner.co.kr' },
      agent_l2: { name: '김민주', email: 'kim_minju@elandinnople.com', department: 'IT개발부서', team: 'ERP팀' },
    };
    console.log(JSON.stringify(entry, null, 2));
  } else {
    console.log('Raw:', response.content);
  }
}

main().catch(e => console.error(e));
