import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/shared/utils/password';
import type {
  CreateUserInput,
  UpdateUserInput,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  CreateTeamInput,
  UpdateTeamInput,
  AgentFilters,
} from '@/shared/types';
import type { User, Organization, Department, Team, Prisma } from '@prisma/client';

export class AdminService {
  // ============================================================
  // Users
  // ============================================================

  async createUser(input: CreateUserInput): Promise<User> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new Error('이미 등록된 이메일입니다.');
    }

    const passwordHash = await hashPassword(input.password);
    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role,
        teamId: input.teamId,
      },
    });
  }

  async updateUser(userId: string, input: UpdateUserInput): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: input,
    });
  }

  async deactivateUser(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: {
          include: {
            department: {
              include: { organization: true },
            },
          },
        },
      },
    });
  }

  async getUsers(filters?: { role?: string; teamId?: string; isActive?: boolean }): Promise<User[]> {
    const where: Prisma.UserWhereInput = {};
    if (filters?.role) where.role = filters.role as never;
    if (filters?.teamId) where.teamId = filters.teamId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return prisma.user.findMany({
      where,
      include: {
        team: {
          include: {
            department: {
              include: { organization: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAgentList(filters?: AgentFilters): Promise<User[]> {
    const where: Prisma.UserWhereInput = {
      role: { in: ['agent_l1', 'agent_l2'] },
    };
    if (filters?.role) where.role = filters.role as unknown as Prisma.EnumUserRoleFilter<"User">;
    if (filters?.teamId) where.teamId = filters.teamId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return prisma.user.findMany({
      where,
      include: { team: true },
      orderBy: { name: 'asc' },
    });
  }

  // ============================================================
  // Organizations
  // ============================================================

  async getOrganizations(): Promise<Organization[]> {
    return prisma.organization.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    return prisma.organization.create({ data: input });
  }

  async updateOrganization(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data: input,
    });
  }

  // ============================================================
  // Departments
  // ============================================================

  async getDepartments(organizationId?: string): Promise<Department[]> {
    const where: Prisma.DepartmentWhereInput = {};
    if (organizationId) where.organizationId = organizationId;

    return prisma.department.findMany({
      where,
      include: { organization: true },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(input: CreateDepartmentInput): Promise<Department> {
    return prisma.department.create({ data: input });
  }

  async updateDepartment(id: string, input: UpdateDepartmentInput): Promise<Department> {
    return prisma.department.update({
      where: { id },
      data: input,
    });
  }

  // ============================================================
  // Teams
  // ============================================================

  async getTeams(departmentId?: string): Promise<Team[]> {
    const where: Prisma.TeamWhereInput = {};
    if (departmentId) where.departmentId = departmentId;

    return prisma.team.findMany({
      where,
      include: { department: { include: { organization: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createTeam(input: CreateTeamInput): Promise<Team> {
    return prisma.team.create({ data: input });
  }

  async updateTeam(id: string, input: UpdateTeamInput): Promise<Team> {
    return prisma.team.update({
      where: { id },
      data: input,
    });
  }
}

export const adminService = new AdminService();
