import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/shared/middleware/auth';
import { adminService } from '@/services/admin.service';
import type { ApiResponse, CreateUserInput, TokenPayload } from '@/shared/types';

/**
 * GET /api/admin/users - 사용자 목록 조회
 */
export const GET = withRole(['admin'], async (request: NextRequest, _payload: TokenPayload) => {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role') || undefined;
  const teamId = searchParams.get('teamId') || undefined;
  const isActive = searchParams.has('isActive')
    ? searchParams.get('isActive') === 'true'
    : undefined;

  const users = await adminService.getUsers({ role, teamId, isActive });
  return NextResponse.json<ApiResponse>({ success: true, data: users });
});

/**
 * POST /api/admin/users - 사용자 생성
 */
export const POST = withRole(['admin'], async (request: NextRequest, _payload: TokenPayload) => {
  try {
    const body = (await request.json()) as CreateUserInput;

    if (!body.email || !body.password || !body.name || !body.role || !body.teamId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '필수 필드를 모두 입력하세요.' },
        { status: 400 },
      );
    }

    const user = await adminService.createUser(body);
    return NextResponse.json<ApiResponse>({ success: true, data: user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '사용자 생성 실패';
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 400 },
    );
  }
});
