import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function check() {
  const orgs = await prisma.organization.findMany();
  console.log('=== Organizations ===', orgs.length);
  orgs.forEach(o => console.log(' ', o.code, '-', o.name));

  const depts = await prisma.department.findMany();
  console.log('\n=== Departments ===', depts.length);
  depts.forEach(d => console.log(' ', d.code, '-', d.name));

  const teams = await prisma.team.findMany();
  console.log('\n=== Teams ===', teams.length);

  const users = await prisma.user.findMany();
  console.log('\n=== Users ===', users.length);
  const byRole: Record<string, number> = {};
  users.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });
  Object.entries(byRole).forEach(([role, count]) => console.log(' ', role, ':', count));

  await prisma.$disconnect();
}
check();
