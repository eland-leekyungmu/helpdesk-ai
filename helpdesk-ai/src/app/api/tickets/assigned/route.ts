import { NextRequest } from "next/server";
import { ticketService } from "@/services/ticket.service";
import { requireAuth } from "@/shared/middleware/auth";
import { successResponse, errorResponse } from "@/shared/utils/api-response";
import { parsePagination, buildPaginationMeta } from "@/shared/utils/pagination";
import type { TicketStatus } from "@/shared/types/index";

/**
 * GET /api/tickets/assigned — 처리자 담당 티켓 목록
 * 허용 역할: agent_l1, agent_l2
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["agent_l1", "agent_l2"]);
  if ("error" in auth) {
    return errorResponse(auth.error.code, auth.error.message, auth.error.status);
  }

  const { searchParams } = new URL(request.url);
  const { skip, take, page, limit } = parsePagination({
    page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  });

  const status = searchParams.get("status") as TicketStatus | null;

  const { items, total } = await ticketService.getAssignedTickets(
    auth.user,
    { status: status ?? undefined },
    skip,
    take
  );

  return successResponse({
    items,
    pagination: buildPaginationMeta(page, limit, total),
  });
}
