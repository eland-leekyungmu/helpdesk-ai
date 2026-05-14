import { NextRequest } from "next/server";
import { ticketService } from "@/services/ticket.service";
import { requireAuth } from "@/shared/middleware/auth";
import { successResponse, errorResponse } from "@/shared/utils/api-response";
import { parsePagination, buildPaginationMeta } from "@/shared/utils/pagination";
import type { Priority } from "@/shared/types/index";

/**
 * GET /api/tickets/queue — 1차 처리자 미처리 큐
 * 허용 역할: agent_l1
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["agent_l1"]);
  if ("error" in auth) {
    return errorResponse(auth.error.code, auth.error.message, auth.error.status);
  }

  const { searchParams } = new URL(request.url);
  const { skip, take, page, limit } = parsePagination({
    page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  });

  const priority = searchParams.get("priority") as Priority | null;
  const category = searchParams.get("category");

  const { items, total } = await ticketService.getUnassignedQueue(
    { priority: priority ?? undefined, category: category ?? undefined },
    skip,
    take
  );

  return successResponse({
    items,
    pagination: buildPaginationMeta(page, limit, total),
  });
}
