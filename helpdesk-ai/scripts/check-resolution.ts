import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // 1. 전체 티켓 현황
  const total = await prisma.ticket.count();
  const resolved = await prisma.ticket.count({ where: { status: { in: ["resolved", "closed"] } } });
  const aiResolved = await prisma.ticket.count({ where: { resolutionType: "ai_auto" } });
  const resolvedWithResolutionType = await prisma.ticket.count({
    where: { status: { in: ["resolved", "closed"] }, resolutionType: { not: null } },
  });

  console.log("\n📊 전체 티켓 현황:");
  console.log(`  전체: ${total}건`);
  console.log(`  해결/종료: ${resolved}건`);
  console.log(`  resolutionType = ai_auto: ${aiResolved}건`);
  console.log(`  해결/종료 중 resolutionType 있는 것: ${resolvedWithResolutionType}건`);

  // 2. resolutionType별 분포
  const byType = await prisma.ticket.groupBy({
    by: ["resolutionType"],
    _count: true,
  });
  console.log("\n📊 resolutionType 분포:");
  byType.forEach((r) => console.log(`  ${r.resolutionType ?? "null"}: ${r._count}건`));

  // 3. 해결률 계산 (analytics service 로직과 동일)
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  console.log(`\n📅 이번 달 기간: ${from.toLocaleDateString()} ~ ${now.toLocaleDateString()}`);

  const monthResolved = await prisma.ticket.count({
    where: { status: { in: ["resolved", "closed"] }, resolvedAt: { gte: from, lte: now } },
  });
  const monthAiResolved = await prisma.ticket.count({
    where: { status: { in: ["resolved", "closed"] }, resolutionType: "ai_auto", resolvedAt: { gte: from, lte: now } },
  });

  console.log(`\n📊 이번 달 해결 현황:`);
  console.log(`  해결/종료 (resolvedAt 기준): ${monthResolved}건`);
  console.log(`  AI 자동 해결 (resolvedAt 기준): ${monthAiResolved}건`);
  console.log(`  → AI 해결률: ${monthResolved > 0 ? ((monthAiResolved / monthResolved) * 100).toFixed(1) : 0}%`);

  // 4. resolvedAt이 null인 resolved 티켓 확인
  const resolvedNoDate = await prisma.ticket.count({
    where: { status: { in: ["resolved", "closed"] }, resolvedAt: null },
  });
  console.log(`\n⚠️  resolved/closed 이지만 resolvedAt = null: ${resolvedNoDate}건`);

  // 5. AI 처리한 티켓 샘플
  const aiSamples = await prisma.ticket.findMany({
    where: { resolutionType: "ai_auto" },
    select: { ticketNumber: true, status: true, resolutionType: true, resolvedAt: true, createdAt: true },
    take: 5,
  });
  console.log("\n📋 AI 처리 티켓 샘플 (최대 5건):");
  aiSamples.forEach((t) =>
    console.log(`  ${t.ticketNumber} | status: ${t.status} | resolvedAt: ${t.resolvedAt?.toISOString() ?? "null"}`)
  );

  await prisma.$disconnect();
}

main().catch(console.error);
