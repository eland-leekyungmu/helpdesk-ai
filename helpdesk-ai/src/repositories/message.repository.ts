import { prisma } from "@/lib/prisma";
import type { SenderType, MessageVisibility, ContentType, MessageSource } from "@/shared/types/index";

export interface CreateMessageData {
  ticketId: string;
  senderId?: string | null;
  senderType: SenderType;
  visibility: MessageVisibility;
  content: string;
  contentType?: ContentType;
  attachments?: unknown;
  source: MessageSource;
  aiOriginalId?: string | null;
}

export const messageRepository = {
  async create(data: CreateMessageData) {
    return prisma.message.create({
      data: {
        ticketId: data.ticketId,
        senderId: data.senderId ?? undefined,
        senderType: data.senderType,
        visibility: data.visibility,
        content: data.content,
        contentType: data.contentType ?? "text",
        attachments: data.attachments ?? undefined,
        source: data.source,
        aiOriginalId: data.aiOriginalId ?? undefined,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });
  },

  async findByTicketId(ticketId: string, visibility?: MessageVisibility) {
    return prisma.message.findMany({
      where: {
        ticketId,
        ...(visibility && { visibility }),
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });
  },

  async findById(id: string) {
    return prisma.message.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });
  },
};
