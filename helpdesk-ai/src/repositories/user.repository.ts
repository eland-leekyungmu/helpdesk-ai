import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/shared/types/index";

/**
 * UserRepository — Unit 2에서 분배 로직에 필요한 사용자 조회
 * Unit 4가 소유하는 users 테이블을 읽기 전용으로 접근
 */
export const userRepository = {
  async findById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamId: true,
        isActive: true,
      },
    });
  },

  async findByTeamId(teamId: string) {
    return prisma.user.findMany({
      where: { teamId, isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  },

  async findByRole(role: UserRole) {
    return prisma.user.findMany({
      where: { role, isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        teamId: true,
        isActive: true,
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamId: true,
        isActive: true,
      },
    });
  },
};
