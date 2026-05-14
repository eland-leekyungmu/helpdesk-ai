import type { UserRole } from './index';

// ============================================================
// Auth Types (Unit 4)
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

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  teamId: string;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  teamId?: string;
  isActive?: boolean;
}

export interface SettingsUpdate {
  confidenceThreshold?: number;
  maxLoginAttempts?: number;
  lockDurationMinutes?: number;
}


export interface CreateDepartmentInput {
  organizationId: string;
  name: string;
  code: string;
}

export interface CreateTeamInput {
  departmentId: string;
  name: string;
  code: string;
}

export interface CreateOrganizationInput {
  name: string;
  code: string;
}


// Aliases
export type UpdateUserInput = UpdateUserRequest;

export type CreateUserInput = CreateUserRequest;

export interface SubmitFeedbackInput {
  messageId: string;
  userId?: string;
  rating: "positive" | "negative";
}

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;
export type UpdateDepartmentInput = Partial<CreateDepartmentInput>;
export type UpdateTeamInput = Partial<CreateTeamInput>;

export interface AgentFilters {
  teamId?: string;
  departmentId?: string;
  role?: string;
  isActive?: boolean;
}

// Analytics types
export interface DateRange {
  startDate?: string;
  endDate?: string;
  from?: Date;
  to?: Date;
}

export interface RateMetric {
  value?: number;
  label?: string;
  trend?: string;
  total?: number;
  count?: number;
  matched?: number;
  rate?: number;
  [key: string]: unknown;
}

export interface CostStats {
  totalCostUsd?: number;
  totalCost?: number;
  totalRequests?: number;
  byModel?: { modelName?: string; model?: string; modelType?: string; requests?: number; calls?: number; costUsd?: number; cost?: number }[];
  byRequestType?: { type: string; count: number; costUsd: number }[];
  [key: string]: unknown;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  ticketCount: number;
  resolvedCount?: number;
  [key: string]: unknown;
}

export interface ReindexStatus {
  status: string;
  message?: string;
  triggeredAt?: string;
  [key: string]: unknown;
}
