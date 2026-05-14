import { messageRepository } from "@/repositories/message.repository";
import * as aiService from "@/services/ai.service";
import type { AuthUser } from "@/shared/middleware/auth";
import type { AddMessageRequest } from "@/shared/types/message";
import type { SenderType, MessageVisibility } from "@/shared/types/index";

export const messageService = {
  /**
   * 메시지 추가
   * - agent_l2는 반드시 private visibility만 허용 (서버 강제 검증)
   * - agent_l2 private 작성 시 AI가 public 변환 자동 생성
   * US-3.2, US-4.2
   */
  async addMessage(input: AddMessageRequest, user: AuthUser) {
    // agent_l2 visibility 강제 검증
    let visibility: MessageVisibility = input.visibility;
    const senderType = (user.role === "employee" ? "user" : user.role) as SenderType;

    if (user.role === "agent_l2") {
      visibility = "private"; // 서버에서 강제
    }

    // 메시지 생성
    const message = await messageRepository.create({
      ticketId: input.ticketId,
      senderId: user.id,
      senderType,
      visibility,
      content: input.content,
      contentType: input.contentType ?? "text",
      source: "web",
    });

    let publicMessage = null;

    // agent_l2 private 메시지 → AI가 public 변환 자동 생성
    if (user.role === "agent_l2" && visibility === "private") {
      const result = await aiService.transformToPublic(input.content);
      const publicContent = result.publicContent;

      const pubMsg = await messageRepository.create({
        ticketId: input.ticketId,
        senderId: null,
        senderType: "ai",
        visibility: "public",
        content: publicContent,
        source: "ai_generated",
        aiOriginalId: message.id,
      });

      publicMessage = {
        id: pubMsg.id,
        content: pubMsg.content,
        senderType: pubMsg.senderType as SenderType,
        visibility: pubMsg.visibility as MessageVisibility,
        aiOriginalId: message.id,
      };
    }

    return {
      id: message.id,
      ticketId: input.ticketId,
      senderId: user.id,
      senderType,
      visibility,
      content: input.content,
      contentType: input.contentType ?? "text",
      source: "web" as const,
      createdAt: message.createdAt.toISOString(),
      publicMessage,
    };
  },
};
