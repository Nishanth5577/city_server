/**
 * Fix Seed — Update user emails to match frontend Quick Login
 */
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, pool: { ssl: { rejectUnauthorized: false } } });
const prisma = new PrismaClient({ adapter });

async function fix() {
  console.log('🔧 Fixing user emails to match frontend...');

  const pass = await bcrypt.hash('admin123', 12);

  // Update existing users
  const admin = await prisma.user.findUnique({ where: { email: 'admin@cityconstructions.com' } });
  if (admin) {
    await prisma.user.update({ where: { id: admin.id }, data: { email: 'admin@cityconstructions.in' } });
    console.log('  ✅ admin@cityconstructions.com → admin@cityconstructions.in');
  }

  const mgr = await prisma.user.findUnique({ where: { email: 'manager@cityconstructions.com' } });
  if (mgr) {
    await prisma.user.update({ where: { id: mgr.id }, data: { email: 'manager@cityconstructions.in' } });
    console.log('  ✅ manager@cityconstructions.com → manager@cityconstructions.in');
  }

  const eng = await prisma.user.findUnique({ where: { email: 'engineer@cityconstructions.com' } });
  if (eng) {
    await prisma.user.update({ where: { id: eng.id }, data: { email: 'engineer@cityconstructions.in' } });
    console.log('  ✅ engineer@cityconstructions.com → engineer@cityconstructions.in');
  }

  // Create supervisor and worker if they don't exist
  const companyId = admin ? (await prisma.user.findUnique({ where: { id: admin.id } }))?.company_id : null;

  const supExists = await prisma.user.findUnique({ where: { email: 'supervisor@cityconstructions.in' } });
  if (!supExists && companyId) {
    await prisma.user.create({
      data: { name: 'Supervisor User', email: 'supervisor@cityconstructions.in', password: await bcrypt.hash('supervisor123', 12), role: 'supervisor', phone: '+91 9876543213', company_id: companyId },
    });
    console.log('  ✅ Created supervisor@cityconstructions.in');
  }

  const wrkExists = await prisma.user.findUnique({ where: { email: 'worker@cityconstructions.in' } });
  if (!wrkExists && companyId) {
    await prisma.user.create({
      data: { name: 'Worker User', email: 'worker@cityconstructions.in', password: await bcrypt.hash('worker123', 12), role: 'worker', phone: '+91 9876543214', company_id: companyId },
    });
    console.log('  ✅ Created worker@cityconstructions.in');
  }

  console.log('\n🎉 Done! Quick Login credentials:');
  console.log('   Admin:      admin@cityconstructions.in / admin123');
  console.log('   Manager:    manager@cityconstructions.in / manager123');
  console.log('   Engineer:   engineer@cityconstructions.in / engineer123');
  console.log('   Supervisor: supervisor@cityconstructions.in / supervisor123');
  console.log('   Worker:     worker@cityconstructions.in / worker123');
}

fix()
  .catch(err => { console.error('❌ Error:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
