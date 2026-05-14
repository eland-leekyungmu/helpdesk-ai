import type { UserRole } from "@/shared/types/index";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string;
}
