import 'dotenv/config';
import { invokeModel } from '../../src/lib/bedrock';

async function main() {
  const prompt = `당신은 이랜드 그룹 IT Help Desk 티켓 데이터 생성 전문가입니다.

[시나리오: 2차 처리자에게 이관 후 해결]

[등장인물]
- 요청자: 허소정 (heo_sojeong@eland.co.kr, 이랜드월드, 1사업부, 점장)
- 1차 처리자: 김보경 (kim_bokyeong@eland-partner.co.kr, ITHelpDesk팀)
- 2차 처리자: 오지희 (oh_jihee@elandinnople.com, 인프라보안부서, 정보보안팀)

[카테고리] 정보보안
[업무 컨텍스트] VPN 계정, 문서보안(DRM), USB, 외부 반출

규칙:
- question: 요청자가 실제로 작성할 법한 자연스러운 문의
- answer: 최종 요청자에게 전달된 답변
- internal_note: 1차→2차 이관 시 내부 메모
- l2_response: 2차 처리자의 내부 답변
- 이랜드 그룹 시스템명(SAP, 이네스, 샵링크, flink, 이오피스, EIMS, GlobalProtect 등) 자연스럽게 사용
- 한국어로 작성
- ⚠️ 중요: JSON 문자열 값 안에서 줄바꿈은 반드시 \\n 으로 표현하세요. 실제 줄바꿈 문자를 넣지 마세요.
- ⚠️ 중요: 응답은 반드시 한 줄의 유효한 JSON이어야 합니다.

JSON으로만 응답 (한 줄로): { "subject": "제목", "question": "문의", "internal_note": "내부메모", "l2_response": "2차답변", "answer": "최종답변", "tags": ["태그"] }`;

  const response = await invokeModel({ prompt, modelType: 'lightweight', maxTokens: 2048, temperature: 0.8 });
  console.log('Duration:', response.durationMs, 'ms\n');

  // 파싱 시도
  const parsed = parseJsonResponse(response.content);
  if (parsed) {
    console.log('✓ 파싱 성공!');
    console.log('subject:', parsed.subject);
    console.log('resolution: l2_resolved');
    console.log('has internal_note:', !!parsed.internal_note);
    console.log('has l2_response:', !!parsed.l2_response);
  } else {
    console.log('✗ 파싱 실패');
    console.log('Raw (first 500 chars):', response.content.substring(0, 500));
  }
}

function parseJsonResponse(content: string): Record<string, unknown> | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* */ }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const oneLine = jsonMatch[0].replace(/\r\n/g, '\\n').replace(/\r/g, '\\n').replace(/\n/g, '\\n');
      return JSON.parse(oneLine);
    }
  } catch { /* */ }

  return null;
}

main().catch(e => console.error(e));
