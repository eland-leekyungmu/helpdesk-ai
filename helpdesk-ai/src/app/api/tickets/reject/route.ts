import { NextRequest } from "next/server";
import { ticketService } from "@/services/ticket.service";
import { requireAuth } from "@/shared/middleware/auth";
import { successResponse, errorResponse } from "@/shared/utils/api-response";

/**
 * POST /api/tickets/reject — "본인 아님" 분배 거절
 * 허용 역할: agent_l2
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["agent_l2"]);
  if ("error" in auth) {
    return errorResponse(auth.error.code, auth.error.message, auth.error.status);
  }

  try {
    const body = await request.json();

    if (!body.assignmentId) {
      return errorResponse("VALIDATION_ERROR", "assignmentId는 필수입니다.", 400);
    }

    await ticketService.rejectAssignment(
      {
        assignmentId: body.assignmentId,
        reason: body.reason,
        suggestedUserId: body.suggestedUserId,
      },
      auth.user
    );

    return successResponse({
      message: "분배가 거절되었습니다. 재분배가 진행됩니다.",
      assignmentId: body.assignmentId,
      status: "rejected",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "거절 처리에 실패했습니다.";
    const errorMap: Record<string, { code: string; status: number }> = {
      ASSIGNMENT_NOT_FOUND: { code: "ASSIGNMENT_NOT_FOUND", status: 404 },
      NOT_YOUR_ASSIGNMENT: { code: "FORBIDDEN", status: 403 },
      ASSIGNMENT_NOT_ACTIVE: { code: "ASSIGNMENT_NOT_ACTIVE", status: 400 },
    };
    const mapped = errorMap[message];
    if (mapped) {
      return errorResponse(mapped.code, message, mapped.status);
    }
    return errorResponse("REJECT_FAILED", message, 500);
  }
}
