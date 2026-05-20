import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  host: 'helpdesk-ai-rds-dev.ch4qks4a8cak.ap-northeast-2.rds.amazonaws.com',
  port: 5432,
  database: 'helpdesk',
  user: 'helpdesk_admin',
  password: 'hG[1Ts7-I$lCTn0D:9grcYcj-eo(',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to RDS');

  // 1. Organization
  const orgRes = await client.query(`
    INSERT INTO organizations (id, name, code, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), '이랜드그룹', 'ELAND', true, now(), now())
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name
  `);
  const orgId = orgRes.rows[0].id;
  console.log('Organization:', orgId, orgRes.rows[0].name);

  // 2. Department
  const deptRes = await client.query(`
    INSERT INTO departments (id, organization_id, name, code, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, 'IT운영팀', 'IT-OPS', true, now(), now())
    ON CONFLICT DO NOTHING
    RETURNING id, name
  `, [orgId]);
  let deptId: string;
  if (deptRes.rows.length > 0) {
    deptId = deptRes.rows[0].id;
  } else {
    const existing = await client.query(`SELECT id FROM departments WHERE code = 'IT-OPS'`);
    deptId = existing.rows[0].id;
  }
  console.log('Department:', deptId);

  // 3. Team
  const teamRes = await client.query(`
    INSERT INTO teams (id, department_id, name, code, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, '인프라팀', 'INFRA', true, now(), now())
    ON CONFLICT DO NOTHING
    RETURNING id, name
  `, [deptId]);
  let teamId: string;
  if (teamRes.rows.length > 0) {
    teamId = teamRes.rows[0].id;
  } else {
    const existing = await client.query(`SELECT id FROM teams WHERE code = 'INFRA'`);
    teamId = existing.rows[0].id;
  }
  console.log('Team:', teamId);

  // 4. Admin user
  const adminHash = await bcrypt.hash('admin1234', 12);
  await client.query(`
    INSERT INTO users (id, email, password_hash, name, role, team_id, is_active, login_attempts, created_at, updated_at)
    VALUES (gen_random_uuid(), 'admin@eland.co.kr', $1, '관리자', 'admin', $2, true, 0, now(), now())
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `, [adminHash, teamId]);
  console.log('Admin: admin@eland.co.kr / admin1234');

  // 5. Employee user
  const empHash = await bcrypt.hash('user1234', 12);
  await client.query(`
    INSERT INTO users (id, email, password_hash, name, role, team_id, is_active, login_attempts, created_at, updated_at)
    VALUES (gen_random_uuid(), 'user@eland.co.kr', $1, '테스트직원', 'employee', $2, true, 0, now(), now())
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `, [empHash, teamId]);
  console.log('Employee: user@eland.co.kr / user1234');

  console.log('\n=== Seed 완료 ===');
}

main()
  .catch(console.error)
  .finally(() => client.end());
