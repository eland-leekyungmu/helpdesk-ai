import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import { adminService } from '@/services/admin.service';
import type { ApiResponse, CreateTeamInput, TokenPayload } from '@/shared/types';

export const GET = withRole(['admin'], async (request: NextRequest, _payload: TokenPayload) => {
  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId') || undefined;
  const teams = await adminService.getTeams(departmentId);
  return NextResponse.json<ApiResponse>({ success: true, data: teams });
});

export const POST = withRole(['admin'], async (request: NextRequest, _payload: TokenPayload) => {
  try {
    const body = (await request.json()) as CreateTeamInput;
    if (!body.departmentId || !body.name || !body.code) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '필수 필드를 모두 입력하세요.' },
        { status: 400 },
      );
    }
    const team = await adminService.createTeam(body);
    return NextResponse.json<ApiResponse>({ success: true, data: team }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '생성 실패';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 400 });
  }
});
