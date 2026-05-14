import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/shared/utils/password';
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MINUTES, JWT_EXPIRES_IN } from '@/shared/constants';
import type { AuthResult, TokenPayload } from '@/shared/types';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';

export class AuthService {
  /**
   * 로그인 처리
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 계정 잠금 확인
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainMin = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new Error(`계정이 잠겼습니다. ${remainMin}분 후 다시 시도하세요.`);
    }

    // 비밀번호 검증
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await this.incrementLoginAttempt(user.id);
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 로그인 성공 → 시도 횟수 초기화
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    // JWT 발급
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * 토큰 검증
   */
  validateToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Role 확인
   */
  checkRole(userRole: string, requiredRoles: string[]): boolean {
    return requiredRoles.includes(userRole);
  }

  /**
   * 로그인 시도 횟수 증가 + 잠금 처리
   */
  async incrementLoginAttempt(userId: string): Promise<void> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: { increment: 1 } },
    });

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(
        Date.now() + LOCK_DURATION_MINUTES * 60 * 1000,
      );
      await prisma.user.update({
        where: { id: userId },
        data: { lockedUntil },
      });
    }
  }
}

export const authService = new AuthService();
