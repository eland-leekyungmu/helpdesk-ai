import type {
  TicketStatus,
  Priority,
  CreatedVia,
  ResolutionType,
  AssignmentType,
  AssignmentStatus,
  Attachment,
  SenderType,
  MessageVisibility,
  ContentType,
  MessageSource,
} from "./index";

// --- Request DTOs ---

export interface CreateTicketRequest {
  subject: string;
  content: string;
  attachments?: Attachment[];
}

export interface AssignTicketRequest {
  ticketId: string;
  assignedTo: string;
  comment?: string;
}

export interface RejectAssignmentRequest {
  assignmentId: string;
  reason?: string;
  suggestedUserId?: string;
}

// --- Response DTOs ---

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  category: string[] | null;
  createdAt: string;
  resolvedAt?: string | null;
  lastMessageAt?: string | null;
}

export interface TicketQueueItem extends TicketSummary {
  requesterName: string;
  confidenceScore: number | null;
  waitingTime: string;
}

export interface TicketAssignedItem extends TicketSummary {
  requesterName: string;
  assignmentType: AssignmentType;
  assignedAt: string;
}

export interface MessageDto {
  id: string;
  senderType: SenderType;
  senderName: string;
  visibility: MessageVisibility;
  content: string;
  contentType: ContentType;
  source: MessageSource;
  aiOriginalId?: string | null;
  createdAt: string;
}

export interface AssignmentDto {
  id: string;
  assignedTo: string;
  assignedToName: string;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  category: string[] | null;
  requesterId: string;
  requesterName: string;
  assignedTo: string | null;
  assignedToName?: string | null;
  createdVia: CreatedVia;
  confidenceScore: number | null;
  resolutionType: ResolutionType | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messages: MessageDto[];
  assignments?: AssignmentDto[];
}

export interface TicketCreateResponse {
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
  createdAt: string;
  aiResponse?: {
    messageId: string;
    content: string;
    confidence: number;
    sources: Array<{ id: string; title: string; relevanceScore: number }>;
  } | null;
}

export interface AssignTicketResponse {
  id: string;
  ticketId: string;
  assignedTo: string;
  assignedBy: string;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
  comment?: string | null;
  createdAt: string;
}
