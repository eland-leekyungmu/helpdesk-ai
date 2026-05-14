import type { UserRole } from '@prisma/client';

// ============================================================
// Auth Types
// ============================================================

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ============================================================
// Admin Types
// ============================================================

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  teamId: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: UserRole;
  teamId?: string;
  isActive?: boolean;
}

export interface CreateOrganizationInput {
  name: string;
  code: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export interface CreateDepartmentInput {
  organizationId: string;
  name: string;
  code: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export interface CreateTeamInput {
  departmentId: string;
  name: string;
  code: string;
}

export interface UpdateTeamInput {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export interface AgentFilters {
  role?: UserRole;
  teamId?: string;
  isActive?: boolean;
}

// ============================================================
// Analytics Types
// ============================================================

export interface DateRange {
  from: Date;
  to: Date;
}

export interface RateMetric {
  total: number;
  matched: number;
  rate: number; // 0~1
}

export interface TimeDistribution {
  avg: number;
  median: number;
  p95: number;
  unit: 'minutes';
}

export interface CostStats {
  totalCost: number;
  breakdown: { label: string; cost: number; count: number }[];
}

export interface TicketStats {
  total: number;
  byStatus: Record<string, number>;
  byResolutionType: Record<string, number>;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  ticketCount: number;
  avgResolutionMinutes: number;
}

// ============================================================
// Feedback Types
// ============================================================

export interface SubmitFeedbackInput {
  messageId: string;
  userId: string;
  rating: 'positive' | 'negative';
}

export interface ReindexStatus {
  status: 'triggered' | 'already_running';
  entriesQueued: number;
}

// ============================================================
// Pagination
// ============================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// API Response
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
