import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const ticketNumber = process.argv[2] || "TK-2026-0031";
  const ticket = await prisma.ticket.update({
    where: { ticketNumber },
    data: { status: "resolved", resolvedAt: new Date() },
  });
  console.log(`${ticket.ticketNumber} → ${ticket.status}`);
  await prisma.$disconnect();
}

main();
