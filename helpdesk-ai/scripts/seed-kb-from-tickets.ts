/**
 * 👍 긍정 피드백을 받은 티켓의 질문-답변 쌍을 knowledge_base_entries에 적재
 * 실행: npx tsx scripts/seed-kb-from-tickets.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== KB 엔트리 적재 시작 (👍 피드백 기준) ===\n");

  // 1. 👍 피드백이 달린 메시지의 ticketId 목록 조회
  const positiveFeedbacks = await prisma.feedback.findMany({
    where: { rating: "positive" },
    select: { messageId: true },
  });

  if (positiveFeedbacks.length === 0) {
    console.log("👍 피드백이 없습니다. 종료합니다.");
    return;
  }

  const messageIds = positiveFeedbacks.map((f) => f.messageId);
  console.log(`👍 피드백 메시지 수: ${messageIds.length}건`);

  // 2. 해당 메시지들의 ticketId 조회
  const messages = await prisma.message.findMany({
    where: { id: { in: messageIds } },
    select: { ticketId: true },
    distinct: ["ticketId"],
  });

  const ticketIds = messages.map((m) => m.ticketId);
  console.log(`대상 티켓 수: ${ticketIds.length}건\n`);

  let inserted = 0;
  let skipped = 0;

  for (const ticketId of ticketIds) {
    // 이미 등록된 건 스킵
    const existing = await prisma.knowledgeBaseEntry.findFirst({
      where: { sourceTicketId: ticketId },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // 티켓 + 메시지 조회
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          where: { visibility: "public" },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket || ticket.messages.length < 2) {
      skipped++;
      continue;
    }

    // 첫 번째 public 메시지 = 질문 (user 또는 system)
    const questionMsg = ticket.messages.find(
      (m) => m.senderType === "user"
    );
    // 마지막 public 메시지 = 답변 (ai 또는 agent)
    const answerMsg = [...ticket.messages]
      .reverse()
      .find((m) => m.senderType === "ai" || m.senderType === "agent_l1" || m.senderType === "agent_l2");

    if (!questionMsg || !answerMsg || questionMsg.id === answerMsg.id) {
      skipped++;
      continue;
    }

    const category = Array.isArray(ticket.category)
      ? (ticket.category as string[])[0] || "미분류"
      : "미분류";

    await prisma.knowledgeBaseEntry.create({
      data: {
        sourceType: "real_data",
        question: questionMsg.content,
        answer: answerMsg.content,
        category,
        isSynthetic: false,
        qualityScore: 1.0, // 👍 피드백 = 최고 품질
        sourceTicketId: ticketId,
      },
    });

    console.log(`✅ [${ticket.ticketNumber}] ${ticket.subject.slice(0, 40)}`);
    inserted++;
  }

  console.log(`\n=== 완료 ===`);
  console.log(`적재: ${inserted}건 / 스킵(중복): ${skipped}건`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
