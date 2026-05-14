import { NextRequest } from "next/server";
import { ticketService } from "@/services/ticket.service";
import { requireAuth } from "@/shared/middleware/auth";
import { successResponse, errorResponse } from "@/shared/utils/api-response";

/**
 * GET /api/tickets/:id — 티켓 상세 조회
 * - employee: public 메시지만
 * - agent/admin: 전체 메시지 (public + private)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return errorResponse(auth.error.code, auth.error.message, auth.error.status);
  }

  const { id } = await params;
  const ticket = await ticketService.getTicketById(id, auth.user);

  if (!ticket) {
    return errorResponse("TICKET_NOT_FOUND", "티켓을 찾을 수 없습니다.", 404);
  }

  return successResponse(ticket);
}
