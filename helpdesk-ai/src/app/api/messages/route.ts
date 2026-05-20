import { NextRequest } from "next/server";
import { messageService } from "@/services/message.service";
import { requireAuth } from "@/shared/middleware/auth";
import { successResponse, errorResponse } from "@/shared/utils/api-response";

/**
 * POST /api/messages — 메시지 추가
 * - employee, agent_l1: public visibility
 * - agent_l2: private visibility (서버 강제)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["employee", "agent_l1", "agent_l2"]);
  if ("error" in auth) {
    return errorResponse(auth.error.code, auth.error.message, auth.error.status);
  }

  try {
    const body = await request.json();

    if (!body.ticketId || !body.content) {
      return errorResponse("VALIDATION_ERROR", "ticketId와 content는 필수입니다.", 400);
    }

    const result = await messageService.addMessage(
      {
        ticketId: body.ticketId,
        content: body.content,
        visibility: body.visibility ?? "public",
        contentType: body.contentType,
        attachments: body.attachments,
      },
      auth.user
    );

    return successResponse(result, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "메시지 추가에 실패했습니다.";
    return errorResponse("MESSAGE_CREATE_FAILED", message, 500);
  }
}
