import { NextRequest } from "next/server";
import { ticketService } from "@/services/ticket.service";
import { requireAuth } from "@/shared/middleware/auth";
import { successResponse, errorResponse } from "@/shared/utils/api-response";

/**
 * POST /api/tickets — 신규 티켓 생성
 * 허용 역할: employee, agent_l1
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["employee", "agent_l1"]);
  if ("error" in auth) {
    return errorResponse(auth.error.code, auth.error.message, auth.error.status);
  }

  try {
    const body = await request.json();

    if (!body.subject || !body.content) {
      return errorResponse("VALIDATION_ERROR", "subject와 content는 필수입니다.", 400);
    }

    const result = await ticketService.createTicket(
      { subject: body.subject, content: body.content, attachments: body.attachments },
      auth.user
    );

    return successResponse(result, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "티켓 생성에 실패했습니다.";
    return errorResponse("TICKET_CREATE_FAILED", message, 500);
  }
}
