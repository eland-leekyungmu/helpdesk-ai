import { ticketRepository } from "@/repositories/ticket.repository";
import { messageRepository } from "@/repositories/message.repository";
import { assignmentRepository } from "@/repositories/assignment.repository";
import { userRepository } from "@/repositories/user.repository";
import { aiService } from "@/services/ai.service";
import { generateTicketNumber } from "@/shared/utils/ticket-number";
import type { AuthUser } from "@/shared/middleware/auth";
import type { UserRole, TicketStatus } from "@/shared/types/index";
import type { CreateTicketRequest, AssignTicketRequest, RejectAssignmentRequest } from "@/shared/types/ticket";
import type { TicketFilters } from "@/repositories/ticket.repository";

// 기본 신뢰도 임계값 (Unit 4 설정에서 동적으로 가져올 수 있음)
const CONFIDENCE_THRESHOLD = 0.75;

export const ticketService = {
  /**
   * 티켓 생성 + AI 자동 응답 흐름
   * US-1.1, US-1.4
   */
  async createTicket(input: CreateTicketRequest, user: AuthUser) {
    const ticketNumber = generateTicketNumber();

    // 1. 티켓 생성
    const ticket = await ticketRepository.create({
      ticketNumber,
      subject: input.subject,
      requesterId: user.id,
      createdVia: "web",
    });

    // 2. 요청자 메시지 저장
    await messageRepository.create({
      ticketId: ticket.id,
      senderId: user.id,
      senderType: "user",
      visibility: "public",
      content: input.content,
      source: "web",
      attachments: input.attachments,
    });

    // 3. AI 답변 생성
    const aiResponse = await aiService.generateAnswer({
      ticketId: ticket.id,
      question: input.content,
      attachments: input.attachments,
    });

    // 4. 카테고리 추천
    const categories = await aiService.suggestCategory(input.content);

    // 5. 신뢰도 및 카테고리 업데이트
    await ticketRepository.updateConfidenceAndCategory(ticket.id, aiResponse.confidence, categories);

    // 6. 라우팅 판정
    const routing = await aiService.determineRouting(aiResponse.confidence, aiResponse.sources);

    let aiMessage = null;

    if (routing.type === "ai_answer" && aiResponse.confidence >= CONFIDENCE_THRESHOLD) {
      // AI 직접 답변 → public 메시지로 저장
      const msg = await messageRepository.create({
        ticketId: ticket.id,
        senderId: null,
        senderType: "ai",
        visibility: "public",
        content: aiResponse.answer,
        source: "ai_generated",
      });
      aiMessage = {
        messageId: msg.id,
        content: aiResponse.answer,
        confidence: aiResponse.confidence,
        sources: aiResponse.sources,
      };
    } else if (routing.type === "route_to_l2") {
      // 2차 처리자 자동 분배
      await ticketRepository.updateAssignedTo(ticket.id, routing.agentId);
      await assignmentRepository.create({
        ticketId: ticket.id,
        assignedTo: routing.agentId,
        assignmentType: "ai_auto",
      });
    }
    // escalate_to_l1: 큐에 남김 (assignedTo = null, status = open)

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      category: categories.length > 0 ? categories : null,
      requesterId: ticket.requesterId,
      assignedTo: ticket.assignedTo,
      createdVia: ticket.createdVia,
      confidenceScore: aiResponse.confidence,
      createdAt: ticket.createdAt.toISOString(),
      aiResponse: aiMessage,
    };
  },

  /**
   * 티켓 상세 조회 (visibility 필터 적용)
   * US-2.2
   */
  async getTicketById(ticketId: string, user: AuthUser) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) return null;

    // 권한 검증: employee는 본인 티켓만
    if (user.role === "employee" && ticket.requesterId !== user.id) {
      return null;
    }

    // employee는 public 메시지만
    const isEmployee = user.role === "employee";
    const messages = ticket.messages
      .filter((m) => !isEmployee || m.visibility === "public")
      .map((m) => ({
        id: m.id,
        senderType: m.senderType,
        senderName: m.sender?.name ?? (m.senderType === "ai" ? "AI 어시스턴트" : "시스템"),
        visibility: m.visibility,
        content: m.content,
        contentType: m.contentType,
        source: m.source,
        aiOriginalId: m.aiOriginalId,
        createdAt: m.createdAt.toISOString(),
      }));

    const assignments = isEmployee
      ? undefined
      : ticket.assignments.map((a) => ({
          id: a.id,
          assignedTo: a.assignedTo,
          assignedToName: a.assignee.name,
          assignmentType: a.assignmentType,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
        }));

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category as string[] | null,
      requesterId: ticket.requesterId,
      requesterName: ticket.requester.name,
      assignedTo: ticket.assignedTo,
      assignedToName: ticket.assignee?.name ?? null,
      createdVia: ticket.createdVia,
      confidenceScore: ticket.confidenceScore ? Number(ticket.confidenceScore) : null,
      resolutionType: ticket.resolutionType,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      messages,
      assignments,
    };
  },

  /**
   * 본인 티켓 목록 조회
   * US-2.1
   */
  async getMyTickets(user: AuthUser, filters: TicketFilters, skip: number, take: number) {
    const { items, total } = await ticketRepository.findByRequesterId(user.id, filters, skip, take);
    return {
      items: items.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        category: t.category as string[] | null,
        createdAt: t.createdAt.toISOString(),
        resolvedAt: t.resolvedAt?.toISOString() ?? null,
        lastMessageAt: t.messages[0]?.createdAt.toISOString() ?? null,
      })),
      total,
    };
  },

  /**
   * 미처리 큐 조회 (agent_l1)
   * US-3.1
   */
  async getUnassignedQueue(filters: TicketFilters, skip: number, take: number) {
    const { items, total } = await ticketRepository.findUnassignedQueue(filters, skip, take);
    return {
      items: items.map((t) => {
        const waitMs = Date.now() - t.createdAt.getTime();
        const hours = Math.floor(waitMs / 3600000);
        const mins = Math.floor((waitMs % 3600000) / 60000);
        return {
          id: t.id,
          ticketNumber: t.ticketNumber,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          category: t.category as string[] | null,
          requesterName: t.requester.name,
          confidenceScore: t.confidenceScore ? Number(t.confidenceScore) : null,
          createdAt: t.createdAt.toISOString(),
          waitingTime: `${hours}h ${mins}m`,
        };
      }),
      total,
    };
  },

  /**
   * 담당 티켓 목록 (agent_l1, agent_l2)
   * US-4.1
   */
  async getAssignedTickets(user: AuthUser, filters: TicketFilters, skip: number, take: number) {
    const { items, total } = await ticketRepository.findAssignedTo(user.id, filters, skip, take);
    return {
      items: items.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        category: t.category as string[] | null,
        requesterName: t.requester.name,
        assignmentType: t.assignments[0]?.assignmentType ?? "manual",
        assignedAt: t.assignments[0]?.createdAt.toISOString() ?? t.createdAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
      total,
    };
  },

  /**
   * 수동 분배 (agent_l1 → agent_l2)
   * US-3.3
   */
  async assignTicket(input: AssignTicketRequest, assignedBy: AuthUser) {
    // 대상 사용자 검증
    const targetUser = await userRepository.findById(input.assignedTo);
    if (!targetUser || !targetUser.isActive) {
      throw new Error("INVALID_ASSIGNEE");
    }

    // 기존 활성 분배 완료 처리
    await assignmentRepository.deactivateByTicketId(input.ticketId);

    // 새 분배 생성
    const assignment = await assignmentRepository.create({
      ticketId: input.ticketId,
      assignedTo: input.assignedTo,
      assignedBy: assignedBy.id,
      assignmentType: "manual",
      comment: input.comment,
    });

    // 티켓 담당자 업데이트
    await ticketRepository.updateAssignedTo(input.ticketId, input.assignedTo);

    return {
      id: assignment.id,
      ticketId: input.ticketId,
      assignedTo: input.assignedTo,
      assignedBy: assignedBy.id,
      assignmentType: "manual" as const,
      status: "active" as const,
      comment: input.comment ?? null,
      createdAt: assignment.createdAt.toISOString(),
    };
  },

  /**
   * "본인 아님" 분배 거절 + 재분배
   * US-4.3
   */
  async rejectAssignment(input: RejectAssignmentRequest, user: AuthUser) {
    const assignment = await assignmentRepository.findById(input.assignmentId);
    if (!assignment) {
      throw new Error("ASSIGNMENT_NOT_FOUND");
    }
    if (assignment.assignedTo !== user.id) {
      throw new Error("NOT_YOUR_ASSIGNMENT");
    }
    if (assignment.status !== "active") {
      throw new Error("ASSIGNMENT_NOT_ACTIVE");
    }

    // 거절 처리
    await assignmentRepository.updateStatus(
      input.assignmentId,
      "rejected",
      input.reason,
      input.suggestedUserId
    );

    // 재분배 로직: previousAssignees 제외
    const previousAssignees = await assignmentRepository.getPreviousAssignees(assignment.ticketId);

    if (input.suggestedUserId && !previousAssignees.includes(input.suggestedUserId)) {
      // 추천 담당자로 재분배
      const newAssignment = await assignmentRepository.create({
        ticketId: assignment.ticketId,
        assignedTo: input.suggestedUserId,
        assignmentType: "reassign",
      });
      await ticketRepository.updateAssignedTo(assignment.ticketId, input.suggestedUserId);
      return { reassignedTo: newAssignment.assignedTo };
    }

    // 추천 없으면 1차 처리자 큐로 에스컬레이션
    await ticketRepository.updateAssignedTo(assignment.ticketId, null);
    await ticketRepository.updateStatus(assignment.ticketId, "open" as TicketStatus);
    return { reassignedTo: null };
  },

  /**
   * 티켓 상태 변경
   */
  async updateStatus(ticketId: string, status: TicketStatus, userId: string) {
    const resolvedAt = status === "resolved" ? new Date() : undefined;
    return ticketRepository.updateStatus(ticketId, status, resolvedAt);
  },
};
