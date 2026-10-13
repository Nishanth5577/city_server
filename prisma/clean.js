require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const a = new PrismaPg({ connectionString: process.env.DATABASE_URL, pool: { ssl: { rejectUnauthorized: false } } });
const p = new PrismaClient({ adapter: a });

(async () => {
  // Delete in dependency order
  await p.constructionStage.deleteMany();
  await p.attendance.deleteMany();
  await p.task.deleteMany();
  await p.expense.deleteMany();
  await p.material.deleteMany();
  await p.worker.deleteMany();
  await p.project.deleteMany();
  await p.company.deleteMany();
  await p.user.deleteMany();
  console.log('✅ Database cleaned');
  await p.$disconnect();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
