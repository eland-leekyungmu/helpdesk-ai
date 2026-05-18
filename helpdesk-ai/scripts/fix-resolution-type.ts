import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // resolved/closed 이면서 resolutionType이 null인 티켓 조회
  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ["resolved", "closed"] },
      resolutionType: null,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          senderType: true,
          source: true,
          visibility: true,
          createdAt: true,
        },
      },
    },
  });

  console.log(`\n📋 resolutionType 미설정 resolved 티켓: ${tickets.length}건\n`);

  const updates: { id: string; ticketNumber: string; resolutionType: string; reason: string }[] = [];

  for (const ticket of tickets) {
    const msgs = ticket.messages;

    // 판단 로직:
    // 1. agent_l1 또는 agent_l2 senderType 메시지가 있으면 → 사람이 개입한 것
    // 2. ai senderType + source=ai_generated 메시지만 있으면 → ai_auto
    // 3. ai senderType + aiOriginalId 있는 메시지 (2차 처리자 가공) → agent_l2

    const hasAgentL1Msg = msgs.some((m) => m.senderType === "agent_l1");
    const hasAgentL2Msg = msgs.some((m) => m.senderType === "agent_l2");
    const hasAiGeneratedMsg = msgs.some((m) => m.senderType === "ai" && m.source === "ai_generated");
    const hasUserMsg = msgs.some((m) => m.senderType === "user");

    let resolutionType: string;
    let reason: string;

    if (hasAgentL2Msg) {
      // 2차 처리자가 직접 작성 (AI는 가공만)
      resolutionType = "agent_l2";
      reason = "agent_l2 메시지 존재";
    } else if (hasAgentL1Msg) {
      // 1차 처리자가 직접 답변
      resolutionType = "agent_l1";
      reason = "agent_l1 메시지 존재";
    } else if (hasAiGeneratedMsg && !hasAgentL1Msg && !hasAgentL2Msg) {
      // AI만 답변 (사람 개입 없음)
      resolutionType = "ai_auto";
      reason = "AI 생성 메시지만 존재, 사람 개입 없음";
    } else {
      // 판단 불가 → agent_l1으로 보수적 처리
      resolutionType = "agent_l1";
      reason = "판단 불가 (보수적으로 agent_l1 처리)";
    }

    updates.push({ id: ticket.id, ticketNumber: ticket.ticketNumber, resolutionType, reason });

    console.log(`  ${ticket.ticketNumber}`);
    console.log(`    메시지: user=${msgs.filter(m=>m.senderType==="user").length}, ai=${msgs.filter(m=>m.senderType==="ai").length}, l1=${msgs.filter(m=>m.senderType==="agent_l1").length}, l2=${msgs.filter(m=>m.senderType==="agent_l2").length}`);
    console.log(`    → resolutionType: ${resolutionType} (${reason})\n`);
  }

  // 업데이트 실행
  console.log("🔄 업데이트 실행 중...\n");
  for (const u of updates) {
    await prisma.ticket.update({
      where: { id: u.id },
      data: { resolutionType: u.resolutionType as any },
    });
    console.log(`  ✅ ${u.ticketNumber} → ${u.resolutionType}`);
  }

  // 결과 확인
  const result = await prisma.ticket.groupBy({
    by: ["resolutionType"],
    where: { status: { in: ["resolved", "closed"] } },
    _count: true,
  });

  console.log("\n📊 업데이트 후 resolutionType 분포:");
  result.forEach((r) => console.log(`  ${r.resolutionType ?? "null"}: ${r._count}건`));

  await prisma.$disconnect();
}

main().catch(console.error);
