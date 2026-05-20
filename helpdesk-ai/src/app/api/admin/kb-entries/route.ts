import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/shared/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/kb-entries?indexed=false
 * 미색인 KB 엔트리 목록 조회 (admin 전용)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if ("error" in auth) {
    return NextResponse.json(
      { success: false, error: auth.error.message },
      { status: auth.error.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const indexedParam = searchParams.get("indexed");

  const where =
    indexedParam === "false"
      ? { indexedAt: null }
      : indexedParam === "true"
      ? { indexedAt: { not: null } }
      : {};

  const entries = await prisma.knowledgeBaseEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ success: true, data: entries });
}
