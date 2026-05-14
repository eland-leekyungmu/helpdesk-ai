import type { MessageVisibility, ContentType, SenderType, MessageSource } from "./index";

export interface AddMessageRequest {
  ticketId: string;
  content: string;
  visibility: MessageVisibility;
  contentType?: ContentType;
}

export interface MessageResponse {
  id: string;
  ticketId: string;
  senderId: string | null;
  senderType: SenderType;
  visibility: MessageVisibility;
  content: string;
  contentType: ContentType;
  source: MessageSource;
  createdAt: string;
  publicMessage?: {
    id: string;
    content: string;
    senderType: SenderType;
    visibility: MessageVisibility;
    aiOriginalId: string;
  } | null;
}
