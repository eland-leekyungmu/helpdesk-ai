import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  const hash = bcrypt.hashSync("1234", 10);

  // 1. 법인
  const org = await prisma.organization.upsert({
    where: { code: "TECH" },
    update: {},
    create: { name: "테크 주식회사", code: "TECH" },
  });
  console.log("✅ 법인:", org.name);

  // 2. 부서
  const deptId = `${org.id}-dept`;
  const dept = await prisma.department.upsert({
    where: { id: deptId },
    update: {},
    create: { id: deptId, organizationId: org.id, name: "IT운영팀", code: "IT-OPS" },
  });
  console.log("✅ 부서:", dept.name);

  // 3. 팀
  const teamId = `${dept.id}-team`;
  const team = await prisma.team.upsert({
    where: { id: teamId },
    update: {},
    create: { id: teamId, departmentId: dept.id, name: "IT지원팀", code: "IT-SUP" },
  });
  console.log("✅ 팀:", team.name);

  // 4. 사용자
  const users = [
    { email: "kim@company.com", name: "김사원", role: "employee" as const },
    { email: "park@company.com", name: "박상담", role: "agent_l1" as const },
    { email: "lee@company.com", name: "이전문", role: "agent_l2" as const },
    { email: "choi@company.com", name: "최관리", role: "admin" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, role: u.role },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: hash,
        teamId: team.id,
      },
    });
    console.log(`✅ ${u.email} → ${u.role}`);
  }

  await prisma.$disconnect();
  await pool.end();
  console.log("\n🎉 시드 완료! 비밀번호: 1234");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
