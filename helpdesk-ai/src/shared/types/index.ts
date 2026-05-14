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
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}
