import { prisma } from "@/lib/prisma";
import type { AssignmentType, AssignmentStatus } from "@/shared/types/index";

export interface CreateAssignmentData {
  ticketId: string;
  assignedTo: string;
  assignedBy?: string | null;
  assignmentType: AssignmentType;
  comment?: string | null;
}

export const assignmentRepository = {
  async create(data: CreateAssignmentData) {
    return prisma.ticketAssignment.create({
      data: {
        ticketId: data.ticketId,
        assignedTo: data.assignedTo,
        assignedBy: data.assignedBy ?? undefined,
        assignmentType: data.assignmentType,
        status: "active",
        comment: data.comment ?? undefined,
      },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });
  },

  async findById(id: string) {
    return prisma.ticketAssignment.findUnique({
      where: { id },
      include: {
        ticket: { select: { id: true, ticketNumber: true, assignedTo: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
  },

  async findByTicketId(ticketId: string) {
    return prisma.ticketAssignment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
      include: { assignee: { select: { id: true, name: true } } },
    });
  },

  async updateStatus(id: string, status: AssignmentStatus, rejectedReason?: string, suggestedUserId?: string) {
    return prisma.ticketAssignment.update({
      where: { id },
      data: {
        status,
        ...(rejectedReason && { rejectedReason }),
        ...(suggestedUserId && { suggestedUserId }),
      },
    });
  },

  async deactivateByTicketId(ticketId: string) {
    return prisma.ticketAssignment.updateMany({
      where: { ticketId, status: "active" },
      data: { status: "completed" },
    });
  },

  async getPreviousAssignees(ticketId: string): Promise<string[]> {
    const assignments = await prisma.ticketAssignment.findMany({
      where: { ticketId },
      select: { assignedTo: true },
    });
    return [...new Set(assignments.map((a) => a.assignedTo))];
  },
};
