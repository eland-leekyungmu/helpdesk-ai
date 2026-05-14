import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import { adminService } from '@/services/admin.service';
import type { ApiResponse, CreateOrganizationInput, TokenPayload } from '@/shared/types';

export const GET = withRole(['admin'], async (_request: NextRequest, _payload: TokenPayload) => {
  const orgs = await adminService.getOrganizations();
  return NextResponse.json<ApiResponse>({ success: true, data: orgs });
});

export const POST = withRole(['admin'], async (request: NextRequest, _payload: TokenPayload) => {
  try {
    const body = (await request.json()) as CreateOrganizationInput;
    if (!body.name || !body.code) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '법인명과 코드를 입력하세요.' },
        { status: 400 },
      );
    }
    const org = await adminService.createOrganization(body);
    return NextResponse.json<ApiResponse>({ success: true, data: org }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '생성 실패';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 400 });
  }
});
