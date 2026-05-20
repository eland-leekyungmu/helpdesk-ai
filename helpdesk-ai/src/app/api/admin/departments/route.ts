import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import { adminService } from '@/services/admin.service';
import type { ApiResponse, CreateDepartmentInput, TokenPayload } from '@/shared/types';

export const GET = withRole(['admin'], async (request: NextRequest, _payload: TokenPayload) => {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId') || undefined;
  const departments = await adminService.getDepartments(organizationId);
  return NextResponse.json<ApiResponse>({ success: true, data: departments });
});

export const POST = withRole(['admin'], async (request: NextRequest, _payload: TokenPayload) => {
  try {
    const body = (await request.json()) as CreateDepartmentInput;
    if (!body.organizationId || !body.name || !body.code) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '필수 필드를 모두 입력하세요.' },
        { status: 400 },
      );
    }
    const dept = await adminService.createDepartment(body);
    return NextResponse.json<ApiResponse>({ success: true, data: dept }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '생성 실패';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 400 });
  }
});
