import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const ticket = await prisma.ticket.findFirst({
    where: { ticketNumber: "TK-2026-0289" },
    include: {
      requester: { select: { name: true, email: true } },
      assignee: { select: { name: true, role: true, team: { select: { name: true } } } },
    },
  });

  if (!ticket) { console.log("티켓 없음"); return; }

  console.log("\n📋 티켓 상태:");
  console.log(`  번호: ${ticket.ticketNumber}`);
  console.log(`  상태: ${ticket.status}`);
  console.log(`  담당자 ID: ${ticket.assignedTo ?? "null (미배정)"}`);
  console.log(`  담당자 정보: ${ticket.assignee ? `${ticket.assignee.name} (${ticket.assignee.team?.name})` : "없음"}`);
  console.log(`  신뢰도: ${ticket.confidenceScore}`);
  console.log(`  카테고리: ${JSON.stringify(ticket.category)}`);

  // 클라우드팀 agent_l2 존재 여부 확인
  const cloudAgents = await prisma.user.findMany({
    where: { role: "agent_l2", isActive: true, team: { name: "클라우드팀" } },
    select: { id: true, name: true, team: { select: { name: true } } },
  });

  console.log(`\n👥 클라우드팀 agent_l2 목록 (${cloudAgents.length}명):`);
  if (cloudAgents.length === 0) {
    console.log("  ❌ 없음 → findAgentByTeam() null 반환 → escalate_to_l1");
  } else {
    cloudAgents.forEach(a => console.log(`  - ${a.name} (${a.team?.name})`));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
