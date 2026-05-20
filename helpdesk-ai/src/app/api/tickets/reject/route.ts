import { NextRequest } from "next/server";
import { ticketService } from "@/services/ticket.service";
import { requireAuth } from "@/shared/middleware/auth";
import { successResponse, errorResponse } from "@/shared/utils/api-response";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tickets/reject — "본인 아님" 분배 거절
 * 허용 역할: agent_l2
 * Body: { assignmentId? } 또는 { ticketId } — 둘 중 하나 필수
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["agent_l2"]);
  if ("error" in auth) {
    return errorResponse(auth.error.code, auth.error.message, auth.error.status);
  }

  try {
    const body = await request.json();

    // assignmentId가 없으면 ticketId로 active assignment 조회
    let assignmentId = body.assignmentId;

    if (!assignmentId && body.ticketId) {
      const activeAssignment = await prisma.ticketAssignment.findFirst({
        where: {
          ticketId: body.ticketId,
          assignedTo: auth.user.id,
          status: "active",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!activeAssignment) {
        return errorResponse("ASSIGNMENT_NOT_FOUND", "활성 배정을 찾을 수 없습니다.", 404);
      }
      assignmentId = activeAssignment.id;
    }

    if (!assignmentId) {
      return errorResponse("VALIDATION_ERROR", "assignmentId 또는 ticketId는 필수입니다.", 400);
    }

    const result = await ticketService.rejectAssignment(
      {
        assignmentId,
        reason: body.reason,
        suggestedUserId: body.suggestedUserId,
      },
      auth.user
    );

    return successResponse({
      message: result.reassignedTo
        ? "재분배가 완료되었습니다."
        : "본인 아님 처리되었습니다. 1차 처리자 큐로 이동합니다.",
      assignmentId,
      reassignedTo: result.reassignedTo,
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
    if (mapped) return errorResponse(mapped.code, message, mapped.status);
    return errorResponse("REJECT_FAILED", message, 500);
  }
}
