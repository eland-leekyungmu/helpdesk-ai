import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.$queryRaw<{ cat: string; cnt: bigint }[]>`
    SELECT 
      jsonb_array_elements_text(category) as cat,
      COUNT(*) as cnt
    FROM tickets
    WHERE category IS NOT NULL
    GROUP BY cat
    ORDER BY cnt DESC
  `;

  console.log("\n📊 DB에 저장된 카테고리 현황:\n");
  if (result.length === 0) {
    console.log("  (카테고리가 저장된 티켓 없음)");
  } else {
    result.forEach((r) => {
      console.log(`  ${r.cat.padEnd(30)} ${r.cnt}건`);
    });
  }

  const total = await prisma.ticket.count({ where: { category: { not: null } } });
  console.log(`\n  총 카테고리 있는 티켓: ${total}건\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
