/**
 * Seed Script — City Constructions ERP
 */
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, pool: { ssl: { rejectUnauthorized: false } } });
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Admin user first (company needs owner)
  const adminPass = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cityconstructions.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@cityconstructions.com', password: adminPass, role: 'admin', phone: '+91 9876543210' },
  });
  console.log('  ✅ Admin:', admin.email);

  // 2. Company
  const company = await prisma.company.upsert({
    where: { id: 'company-demo-001' },
    update: {},
    create: {
      id: 'company-demo-001', company_name: 'City Constructions Pvt Ltd', owner_id: admin.id,
      address_street: '45 Anna Nagar', address_city: 'Erode', address_state: 'Tamil Nadu',
      address_zip: '638001', address_country: 'India', contact_phone: '+91 9876543210',
      contact_email: 'info@cityconstructions.com', gst_number: '33AABCC1234D1ZN', pan_number: 'AABCC1234D',
    },
  });
  await prisma.user.update({ where: { id: admin.id }, data: { company_id: company.id } });
  console.log('  ✅ Company:', company.company_name);

  // 3. Manager
  const mgrPass = await bcrypt.hash('manager123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@cityconstructions.com' },
    update: {},
    create: { name: 'Rajesh Kumar', email: 'manager@cityconstructions.com', password: mgrPass, role: 'project_manager', phone: '+91 9876543211', company_id: company.id },
  });
  console.log('  ✅ Manager:', manager.email);

  // 4. Engineer
  const engPass = await bcrypt.hash('engineer123', 12);
  const engineer = await prisma.user.upsert({
    where: { email: 'engineer@cityconstructions.com' },
    update: {},
    create: { name: 'Priya Sharma', email: 'engineer@cityconstructions.com', password: engPass, role: 'engineer', phone: '+91 9876543212', company_id: company.id },
  });
  console.log('  ✅ Engineer:', engineer.email);

  // 5. Projects
  const project1 = await prisma.project.upsert({
    where: { id: 'proj-001' },
    update: {},
    create: {
      id: 'proj-001', project_name: 'Green Valley Residency', project_id: 'GVR-2024-001',
      client_name: 'Sunrise Developers', project_type: 'residential', project_status: 'in_progress',
      progress_percentage: 45, budget: 50000000, contract_value: 55000000, location: 'Erode, Tamil Nadu',
      start_date: new Date('2024-03-01'), expected_end_date: new Date('2025-06-30'),
      manager_id: manager.id, created_by: admin.id, company_id: company.id,
      description: '120-unit residential apartment complex',
    },
  });
  const project2 = await prisma.project.upsert({
    where: { id: 'proj-002' },
    update: {},
    create: {
      id: 'proj-002', project_name: 'Tech Park Phase II', project_id: 'TPP2-2024-002',
      client_name: 'InfoTech Holdings', project_type: 'commercial', project_status: 'in_progress',
      progress_percentage: 72, budget: 120000000, contract_value: 135000000, location: 'Coimbatore, Tamil Nadu',
      start_date: new Date('2024-01-15'), expected_end_date: new Date('2025-03-31'),
      manager_id: manager.id, created_by: admin.id, company_id: company.id,
      description: '5-floor commercial IT park',
    },
  });
  console.log('  ✅ Projects: 2 created');

  // 6. Workers
  for (const w of [
    { name: 'Murugan S', skill: 'Mason', experience: 8, salary: 800, salary_type: 'daily', availability: 'available', company_id: company.id, assigned_project_id: project1.id },
    { name: 'Velu K', skill: 'Carpenter', experience: 12, salary: 25000, salary_type: 'monthly', availability: 'available', company_id: company.id, assigned_project_id: project1.id },
    { name: 'Ravi M', skill: 'Electrician', experience: 6, salary: 900, salary_type: 'daily', availability: 'available', company_id: company.id, assigned_project_id: project2.id },
    { name: 'Kumar P', skill: 'Plumber', experience: 5, salary: 750, salary_type: 'daily', availability: 'on_leave', company_id: company.id },
    { name: 'Devi R', skill: 'Painter', experience: 4, salary: 700, salary_type: 'daily', availability: 'available', company_id: company.id, assigned_project_id: project1.id },
  ]) await prisma.worker.create({ data: w });
  console.log('  ✅ Workers: 5 created');

  // 7. Tasks (uses completion_percentage, assigned_worker_id, no company_id)
  for (const t of [
    { task_name: 'Foundation Excavation', status: 'completed', priority: 'high', completion_percentage: 100, project_id: project1.id, assigned_worker_id: engineer.id, created_by: manager.id, start_date: new Date('2024-03-01'), end_date: new Date('2024-04-15') },
    { task_name: 'Column Reinforcement', status: 'in_progress', priority: 'high', completion_percentage: 65, project_id: project1.id, assigned_worker_id: engineer.id, created_by: manager.id, start_date: new Date('2024-04-20'), end_date: new Date('2024-07-30') },
    { task_name: 'Electrical Wiring Phase 1', status: 'pending', priority: 'medium', completion_percentage: 0, project_id: project1.id, created_by: manager.id, start_date: new Date('2024-08-01'), end_date: new Date('2024-10-30') },
    { task_name: 'IT Infrastructure Setup', status: 'in_progress', priority: 'critical', completion_percentage: 45, project_id: project2.id, assigned_worker_id: engineer.id, created_by: manager.id, start_date: new Date('2024-06-01'), end_date: new Date('2024-12-31') },
  ]) await prisma.task.create({ data: t });
  console.log('  ✅ Tasks: 4 created');

  // 8. Expenses
  for (const e of [
    { category: 'materials', description: 'Cement (500 bags)', amount: 250000, date: new Date('2024-04-10'), approved_status: 'approved', project_id: project1.id, created_by: manager.id, approved_by: admin.id, company_id: company.id },
    { category: 'labor', description: 'April labor payments', amount: 180000, date: new Date('2024-04-30'), approved_status: 'approved', project_id: project1.id, created_by: manager.id, approved_by: admin.id, company_id: company.id },
    { category: 'equipment', description: 'Crane rental', amount: 95000, date: new Date('2024-05-15'), approved_status: 'pending', project_id: project2.id, created_by: manager.id, company_id: company.id },
  ]) await prisma.expense.create({ data: e });
  console.log('  ✅ Expenses: 3 created');

  // 9. Materials
  for (const m of [
    { material_name: 'Portland Cement', category: 'cement', quantity: 1000, available_stock: 350, used_stock: 650, unit: 'bags', cost: 380, supplier: 'UltraTech', project_id: project1.id, company_id: company.id, low_stock_threshold: 200 },
    { material_name: 'TMT Steel Bars (12mm)', category: 'steel', quantity: 5000, available_stock: 2200, used_stock: 2800, unit: 'kg', cost: 65, supplier: 'Tata Steel', project_id: project1.id, company_id: company.id, low_stock_threshold: 500 },
    { material_name: 'River Sand', category: 'sand', quantity: 200, available_stock: 80, used_stock: 120, unit: 'tons', cost: 2500, supplier: 'Local Quarry', project_id: project2.id, company_id: company.id, low_stock_threshold: 50 },
  ]) await prisma.material.create({ data: m });
  console.log('  ✅ Materials: 3 created');

  // 10. Construction Stages (completion_percentage, no company_id, notes not description)
  for (const s of [
    { stage_name: 'Foundation', stage_order: 1, status: 'completed', completion_percentage: 100, project_id: project1.id, notes: 'Foundation and footing work', updated_by: engineer.id },
    { stage_name: 'Substructure', stage_order: 2, status: 'completed', completion_percentage: 100, project_id: project1.id, notes: 'Basement and plinth beam', updated_by: engineer.id },
    { stage_name: 'Superstructure', stage_order: 3, status: 'in_progress', completion_percentage: 45, project_id: project1.id, notes: 'Columns, beams, slabs', updated_by: engineer.id },
    { stage_name: 'MEP Rough-in', stage_order: 4, status: 'not_started', completion_percentage: 0, project_id: project1.id, notes: 'Mechanical, electrical, plumbing rough-in' },
    { stage_name: 'Finishing', stage_order: 5, status: 'not_started', completion_percentage: 0, project_id: project1.id, notes: 'Plastering, painting, flooring' },
  ]) await prisma.constructionStage.create({ data: s });
  console.log('  ✅ Stages: 5 created');

  console.log('\n🎉 Seeding complete!');
  console.log('   Login credentials:');
  console.log('   Admin:    admin@cityconstructions.com / admin123');
  console.log('   Manager:  manager@cityconstructions.com / manager123');
  console.log('   Engineer: engineer@cityconstructions.com / engineer123');
}

seed()
  .catch((err) => { console.error('❌ Seed error:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
