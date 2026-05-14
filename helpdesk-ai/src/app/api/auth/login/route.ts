import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import type { ApiResponse, AuthResult, LoginRequest } from '@/shared/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequest;

    if (!body.email || !body.password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '이메일과 비밀번호를 입력하세요.' },
        { status: 400 },
      );
    }

    const result = await authService.login(body.email, body.password);

    return NextResponse.json<ApiResponse<AuthResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '로그인 실패';
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 401 },
    );
  }
}
