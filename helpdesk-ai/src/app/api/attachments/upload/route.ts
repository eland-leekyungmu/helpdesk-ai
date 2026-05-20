import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/shared/middleware/auth";
import { getPresignedUploadUrl, MAX_FILE_SIZE_BYTES, MAX_FILE_COUNT } from "@/lib/s3";
import type { ApiResponse } from "@/shared/types";

/**
 * POST /api/attachments/upload
 * Body: { ticketId, files: [{ filename, mimeType, size }] }
 * Returns: [{ uploadUrl, key, filename }]
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
  const { ticketId, files } = body as {
    ticketId: string;
    files: { filename: string; mimeType: string; size: number }[];
  };

  if (!ticketId || !files?.length) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "ticketId와 files는 필수입니다." },
      { status: 400 }
    );
  }

  if (files.length > MAX_FILE_COUNT) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: `파일은 최대 ${MAX_FILE_COUNT}개까지 첨부할 수 있습니다.` },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `파일 크기는 ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다. (${file.filename})` },
        { status: 400 }
      );
    }
  }

  try {
    const results = await Promise.all(
      files.map((file) =>
        getPresignedUploadUrl(ticketId, file.filename, file.mimeType, file.size).then(
          ({ uploadUrl, key }) => ({ uploadUrl, key, filename: file.filename, mimeType: file.mimeType, size: file.size })
        )
      )
    );

    return NextResponse.json<ApiResponse>({ success: true, data: results });
  } catch (error) {
    console.error("[Attachment Upload] Error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "업로드 URL 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
