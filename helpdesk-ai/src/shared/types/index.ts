// 공통 Enum/타입 정의 (Prisma enum과 동기화)

export type UserRole = "employee" | "agent_l1" | "agent_l2" | "admin";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type MessageVisibility = "public" | "private";
export type SenderType = "user" | "agent_l1" | "agent_l2" | "ai" | "system";
export type CreatedVia = "web" | "email";
export type AssignmentType = "ai_auto" | "manual" | "reassign";
export type AssignmentStatus = "active" | "rejected" | "completed";
export type Priority = "low" | "medium" | "high";
export type ContentType = "text" | "html";
export type MessageSource = "web" | "email" | "ai_generated";
export type ResolutionType = "ai_auto" | "agent_l1" | "agent_l2";
export type FeedbackRating = "positive" | "negative";

export interface Attachment {
  filename: string;
  fileSize: number;
  mimeType: string;
  size: number;
  url: string;
}


// Frontend에서 사용하는 인터페이스 (Unit 1)
export type TicketPriority = Priority; // alias for frontend compatibility

export interface Organization {
  id: string;
  name: string;
  code: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  organization?: Organization;
}

export interface Team {
  id: string;
  departmentId: string;
  name: string;
  code: string;
  department?: Department;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string;
  team?: Team;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  category: string[] | null;
  requesterId: string;
  assignedTo: string | null;
  createdVia: CreatedVia;
  confidenceScore: number | null;
  resolutionType: ResolutionType | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  requester?: User;
  assignee?: User;
}

export interface Message {
  id: string;
  ticketId: string;
  senderId: string | null;
  senderType: SenderType;
  visibility: MessageVisibility;
  content: string;
  contentType: ContentType;
  attachments: AttachmentMeta[] | null;
  source: MessageSource;
  createdAt: string;
  sender?: User;
}

export interface AttachmentMeta {
  filename: string;
  size: number;
  mimeType: string;
  url: string;
}

export interface TicketAssignment {
  id: string;
  ticketId: string;
  assignedTo: string;
  assignedBy: string | null;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
  rejectedReason: string | null;
  suggestedUserId: string | null;
  comment: string | null;
  createdAt: string;
  assignee?: User;
  assigner?: User;
}

export interface Feedback {
  id: string;
  messageId: string;
  userId: string;
  rating: FeedbackRating;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface KpiStats {
  resolutionRate: number;
  routingAccuracy: number;
  avgProcessingTimeHours: number;
}

export interface LlmCostStats {
  totalCost: number;
  byModel: { model: string; cost: number; calls: number }[];
  byPeriod: { date: string; cost: number }[];
}
