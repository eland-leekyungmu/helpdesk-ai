import { NextRequest } from "next/server";
import { ticketService } from "@/services/ticket.service";
import { requireAuth } from "@/shared/middleware/auth";
import { successResponse, errorResponse } from "@/shared/utils/api-response";

/**
 * POST /api/tickets/assign — 수동 분배 (agent_l1 → agent_l2)
 * 허용 역할: agent_l1
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["agent_l1"]);
  if ("error" in auth) {
    return errorResponse(auth.error.code, auth.error.message, auth.error.status);
  }

  try {
    const body = await request.json();

    if (!body.ticketId || !body.assignedTo) {
      return errorResponse("VALIDATION_ERROR", "ticketId와 assignedTo는 필수입니다.", 400);
    }

    const result = await ticketService.assignTicket(
      { ticketId: body.ticketId, assignedTo: body.assignedTo, comment: body.comment },
      auth.user
    );

    return successResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "분배에 실패했습니다.";
    if (message === "INVALID_ASSIGNEE") {
      return errorResponse("INVALID_ASSIGNEE", "유효하지 않은 담당자입니다.", 400);
    }
    return errorResponse("ASSIGN_FAILED", message, 500);
  }
}
