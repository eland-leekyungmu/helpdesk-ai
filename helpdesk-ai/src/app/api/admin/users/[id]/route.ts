import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/shared/middleware/auth';
import { adminService } from '@/services/admin.service';
import type { ApiResponse, UpdateUserInput } from '@/shared/types';

function unauthorized() {
  return NextResponse.json<ApiResponse>(
    { success: false, error: '인증 토큰이 필요합니다.' },
    { status: 401 },
  );
}

function forbidden() {
  return NextResponse.json<ApiResponse>(
    { success: false, error: '접근 권한이 없습니다.' },
    { status: 403 },
  );
}

function authenticate(request: NextRequest) {
  const token = extractToken(request);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

/**
 * GET /api/admin/users/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const payload = authenticate(request);
  if (!payload) return payload === null ? unauthorized() : forbidden();

  const { id } = await params;
  const user = await adminService.getUserById(id);

  if (!user) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: '사용자를 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return NextResponse.json<ApiResponse>({ success: true, data: user });
}

/**
 * PATCH /api/admin/users/:id
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const payload = authenticate(request);
  if (!payload) return unauthorized();

  const { id } = await params;
  const body = (await request.json()) as UpdateUserInput;

  try {
    const user = await adminService.updateUser(id, body);
    return NextResponse.json<ApiResponse>({ success: true, data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : '수정 실패';
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 400 },
    );
  }
}

/**
 * DELETE /api/admin/users/:id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const payload = authenticate(request);
  if (!payload) return unauthorized();

  const { id } = await params;
  await adminService.deactivateUser(id);
  return NextResponse.json<ApiResponse>({ success: true });
}
