import { prisma } from "@/lib/prisma";
import type { TicketStatus, CreatedVia, Priority } from "@/shared/types/index";

export interface CreateTicketData {
  ticketNumber: string;
  subject: string;
  status?: TicketStatus;
  priority?: Priority;
  category?: string[];
  requesterId: string;
  assignedTo?: string;
  createdVia: CreatedVia;
  confidenceScore?: number;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: Priority;
  category?: string;
}

export const ticketRepository = {
  async create(data: CreateTicketData) {
    return prisma.ticket.create({
      data: {
        ticketNumber: data.ticketNumber,
        subject: data.subject,
        status: data.status ?? "open",
        priority: data.priority ?? "medium",
        category: data.category ?? undefined,
        requesterId: data.requesterId,
        assignedTo: data.assignedTo ?? undefined,
        createdVia: data.createdVia,
        confidenceScore: data.confidenceScore ?? undefined,
      },
    });
  },

  async findById(id: string) {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, name: true, email: true, role: true } },
        messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true, role: true } } } },
        assignments: {
          orderBy: { createdAt: "desc" },
          include: {
            assignee: { select: { id: true, name: true } },
            assigner: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  async findByRequesterId(requesterId: string, filters: TicketFilters, skip: number, take: number) {
    const where = { requesterId, ...(filters.status && { status: filters.status }) };
    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } },
      }),
      prisma.ticket.count({ where }),
    ]);
    return { items, total };
  },

  async findUnassignedQueue(filters: TicketFilters, skip: number, take: number) {
    const where = {
      status: "open" as const,
      assignedTo: null,
      ...(filters.priority && { priority: filters.priority }),
    };
    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "asc" },
        include: { requester: { select: { name: true } } },
      }),
      prisma.ticket.count({ where }),
    ]);
    return { items, total };
  },

  async findAssignedTo(agentId: string, filters: TicketFilters, skip: number, take: number) {
    const where = {
      assignedTo: agentId,
      ...(filters.status && { status: filters.status }),
    };
    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          requester: { select: { name: true } },
          assignments: {
            where: { assignedTo: agentId, status: "active" },
            take: 1,
            select: { assignmentType: true, createdAt: true },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);
    return { items, total };
  },

  async updateStatus(id: string, status: TicketStatus, resolvedAt?: Date, resolutionType?: string) {
    return prisma.ticket.update({
      where: { id },
      data: {
        status,
        ...(resolvedAt && { resolvedAt }),
        ...(resolutionType && { resolutionType: resolutionType as any }),
      },
    });
  },

  async updateAssignedTo(id: string, assignedTo: string | null) {
    return prisma.ticket.update({
      where: { id },
      data: { assignedTo, status: assignedTo ? "in_progress" : "open" },
    });
  },

  async updateConfidenceAndCategory(id: string, confidenceScore: number, category: string[]) {
    return prisma.ticket.update({
      where: { id },
      data: { confidenceScore, category },
    });
  },
};
