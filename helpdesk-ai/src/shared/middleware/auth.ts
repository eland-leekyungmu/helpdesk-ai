import { NextRequest } from "next/server";
import type { UserRole } from "../types/index";

/**
 * JWT 토큰에서 추출된 사용자 정보
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string;
}

/**
 * 요청에서 인증된 사용자 정보를 추출합니다.
 * Unit 4에서 실제 JWT 검증 로직을 구현할 예정.
 * 현재는 헤더에서 사용자 정보를 파싱하는 stub입니다.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  // TODO: Unit 4에서 실제 JWT 검증으로 교체
  // 현재는 개발용으로 토큰을 base64 디코딩하여 사용자 정보 추출
  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64").toString());
    return {
      id: payload.sub || payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      teamId: payload.teamId,
    };
  } catch {
    return null;
  }
}

/**
 * 역할 기반 접근 제어 검증
 */
export function hasRole(user: AuthUser, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * 인증 필수 + 역할 검증 헬퍼
 */
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: UserRole[]
): Promise<{ user: AuthUser } | { error: { code: string; message: string; status: number } }> {
  const user = await getAuthUser(request);
  if (!user) {
    return { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다.", status: 401 } };
  }
  if (allowedRoles && !hasRole(user, allowedRoles)) {
    return { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다.", status: 403 } };
  }
  return { user };
}
