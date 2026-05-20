import { NextRequest } from "next/server";
import { emailService } from "@/services/email.service";
import { successResponse, errorResponse } from "@/shared/utils/api-response";

/**
 * POST /api/webhooks/ses-inbound — SES 인바운드 이메일 수신
 * SES → Lambda → 이 엔드포인트 호출
 * 인증: Lambda에서 내부 시크릿 키로 호출 (외부 접근 차단)
 */
export async function POST(request: NextRequest) {
  // 내부 호출 검증 (Lambda → API)
  const internalKey = request.headers.get("x-internal-key");
  if (internalKey !== process.env.INTERNAL_WEBHOOK_KEY) {
    return errorResponse("UNAUTHORIZED", "유효하지 않은 요청입니다.", 401);
  }

  try {
    const body = await request.json();
    const payload = body.payload;

    if (!payload?.messageId || !payload?.from || !payload?.bodyText) {
      return errorResponse("VALIDATION_ERROR", "필수 필드가 누락되었습니다.", 400);
    }

    const result = await emailService.processInboundEmail({
      messageId: payload.messageId,
      from: payload.from,
      to: payload.to,
      subject: payload.subject ?? "(제목 없음)",
      inReplyTo: payload.inReplyTo,
      references: payload.references,
      bodyText: payload.bodyText,
      bodyHtml: payload.bodyHtml,
      attachments: payload.attachments ?? [],
    });

    return successResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "이메일 처리에 실패했습니다.";
    return errorResponse("EMAIL_PROCESS_FAILED", message, 500);
  }
}
