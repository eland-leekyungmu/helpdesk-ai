import { prisma } from "@/lib/prisma";

export interface CreateEmailThreadData {
  ticketId: string;
  messageIdHeader: string;
  inReplyTo?: string | null;
  references?: string | null;
  fromEmail: string;
  subject: string;
}

export const emailThreadRepository = {
  async create(data: CreateEmailThreadData) {
    return prisma.emailThread.create({ data });
  },

  async findByMessageIdHeader(messageIdHeader: string) {
    return prisma.emailThread.findFirst({
      where: { messageIdHeader },
      include: { ticket: { select: { id: true, ticketNumber: true } } },
    });
  },

  async findByInReplyTo(inReplyTo: string) {
    return prisma.emailThread.findFirst({
      where: { messageIdHeader: inReplyTo },
      include: { ticket: { select: { id: true, ticketNumber: true } } },
    });
  },

  async findByTicketId(ticketId: string) {
    return prisma.emailThread.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
    });
  },
};
