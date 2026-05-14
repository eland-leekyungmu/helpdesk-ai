import { emailThreadRepository } from "@/repositories/email-thread.repository";
import { ticketRepository } from "@/repositories/ticket.repository";
import { messageRepository } from "@/repositories/message.repository";
import { userRepository } from "@/repositories/user.repository";
import { generateTicketNumber } from "@/shared/utils/ticket-number";

/**
 * SES 인바운드 이메일 파싱 결과
 */
export interface ParsedEmail {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  inReplyTo?: string;
  references?: string[];
  bodyText: string;
  bodyHtml?: string;
  attachments: Array<{ fileName: string; mimeType: string; s3Key: string }>;
}

export const emailService = {
  /**
   * 이메일 스레드 기반 티켓 식별
   * US-5.2
   */
  async identifyThread(inReplyTo?: string, references?: string[]): Promise<string | null> {
    // In-Reply-To 헤더로 매칭
    if (inReplyTo) {
      const thread = await emailThreadRepository.findByInReplyTo(inReplyTo);
      if (thread) return thread.ticket.id;
    }

    // References 헤더로 매칭 (역순 탐색)
    if (references && references.length > 0) {
      for (const ref of [...references].reverse()) {
        const thread = await emailThreadRepository.findByInReplyTo(ref);
        if (thread) return thread.ticket.id;
      }
    }

    return null;
  },

  /**
   * 인바운드 이메일 처리
   * US-5.1
   */
  async processInboundEmail(email: ParsedEmail) {
    // 1. 스레드 식별
    const existingTicketId = await this.identifyThread(email.inReplyTo, email.references);

    if (existingTicketId) {
      // 기존 티켓에 메시지 추가 (재문의 US-5.3)
      const sender = await userRepository.findByEmail(email.from);

      await messageRepository.create({
        ticketId: existingTicketId,
        senderId: sender?.id ?? null,
        senderType: "user",
        visibility: "public",
        content: email.bodyText,
        source: "email",
      });

      // 이메일 스레드 기록
      await emailThreadRepository.create({
        ticketId: existingTicketId,
        messageIdHeader: email.messageId,
        inReplyTo: email.inReplyTo ?? null,
        references: email.references?.join(" ") ?? null,
        fromEmail: email.from,
        subject: email.subject,
      });

      return { action: "message_added", ticketId: existingTicketId };
    }

    // 2. 신규 티켓 생성
    const sender = await userRepository.findByEmail(email.from);
    const ticketNumber = generateTicketNumber();

    const ticket = await ticketRepository.create({
      ticketNumber,
      subject: email.subject,
      requesterId: sender?.id ?? "unknown",
      createdVia: "email",
    });

    // 요청 메시지 저장
    await messageRepository.create({
      ticketId: ticket.id,
      senderId: sender?.id ?? null,
      senderType: "user",
      visibility: "public",
      content: email.bodyText,
      source: "email",
    });

    // 이메일 스레드 기록
    await emailThreadRepository.create({
      ticketId: ticket.id,
      messageIdHeader: email.messageId,
      inReplyTo: email.inReplyTo ?? null,
      references: email.references?.join(" ") ?? null,
      fromEmail: email.from,
      subject: email.subject,
    });

    return { action: "ticket_created", ticketId: ticket.id, ticketNumber };
  },

  /**
   * Private 메시지 이메일 발송 차단 검증
   * US-5.4
   */
  validatePrivateBlock(visibility: string): boolean {
    return visibility !== "private";
  },

  /**
   * 이메일 답변 발송 (Public만 허용)
   * US-5.4
   */
  async sendReply(ticketId: string, messageId: string) {
    const message = await messageRepository.findById(messageId);
    if (!message) throw new Error("MESSAGE_NOT_FOUND");

    // Private 메시지 발송 차단
    if (!this.validatePrivateBlock(message.visibility)) {
      throw new Error("PRIVATE_MESSAGE_CANNOT_BE_SENT");
    }

    // TODO: Unit 5에서 SES SDK 연동 구현
    // 현재는 발송 가능 여부만 검증
    return { sent: true, messageId };
  },
};
