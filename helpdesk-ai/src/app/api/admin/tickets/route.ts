import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/shared/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/tickets - 전체 티켓 조회 (admin, agent_l1)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["admin", "agent_l1"]);
  if ("error" in auth) {
    return NextResponse.json(
      { success: false, error: auth.error.message },
      { status: auth.error.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status && status !== "all") {
    where.status = status;
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      items: tickets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
}
