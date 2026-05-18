import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/shared/middleware/auth";
import { getPresignedDownloadUrl } from "@/lib/s3";
import type { ApiResponse } from "@/shared/types";

/**
 * POST /api/attachments/download
 * Body: { key, filename }
 * Returns: { downloadUrl }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["employee", "agent_l1", "agent_l2", "admin"]);
  if ("error" in auth) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: auth.error.message },
      { status: auth.error.status }
    );
  }

  const body = await request.json();
  const { key, filename } = body as { key: string; filename: string };

  if (!key || !filename) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "key와 filename은 필수입니다." },
      { status: 400 }
    );
  }

  try {
    const downloadUrl = await getPresignedDownloadUrl(key, filename);
    return NextResponse.json<ApiResponse>({ success: true, data: { downloadUrl } });
  } catch (error) {
    console.error("[Attachment Download] Error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "다운로드 URL 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
