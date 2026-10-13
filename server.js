require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const compression = require('compression');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { getDBStatus } = require('./config/db');
const prisma = require('./config/prisma');
const { errorHandler, notFound } = require('./middleware/error');
const setupSocket = require('./services/socketService');

// Connect to Supabase PostgreSQL and seed if empty
const initDB = async () => {
  await connectDB();

  // Auto-seed if no users exist (fresh database)
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log('ðŸŒ± Seeding fresh Supabase database with demo data...');
      const bcrypt = require('bcryptjs');
      const { CONSTRUCTION_STAGES } = require('./utils/constants');

      const hashPw = async (pw) => bcrypt.hash(pw, 12);

      const admin = await prisma.user.create({ data: { name: 'Karthikeyan S', email: 'admin@cityconstructions.in', password: await hashPw('admin123'), role: 'admin', phone: '+91 9876543210' } });
      const company = await prisma.company.create({ data: { company_name: 'City Constructions', owner_id: admin.id, address_street: '15, Anna Nagar Main Road', address_city: 'Chennai', address_state: 'Tamil Nadu', address_zip: '600040', address_country: 'India', contact_phone: '+91 44 2345 6789', contact_email: 'info@cityconstructions.in' } });
      await prisma.user.update({ where: { id: admin.id }, data: { company_id: company.id } });

      const manager = await prisma.user.create({ data: { name: 'Priya Sharma', email: 'manager@cityconstructions.in', password: await hashPw('manager123'), role: 'project_manager', phone: '+91 9876543211', company_id: company.id } });
      const engineer = await prisma.user.create({ data: { name: 'Amit Patel', email: 'engineer@cityconstructions.in', password: await hashPw('engineer123'), role: 'engineer', company_id: company.id } });
      await prisma.user.create({ data: { name: 'Suresh Kumar', email: 'supervisor@cityconstructions.in', password: await hashPw('supervisor123'), role: 'supervisor', company_id: company.id } });
      const workerUser = await prisma.user.create({ data: { name: 'Ramesh Yadav', email: 'worker@cityconstructions.in', password: await hashPw('worker123'), role: 'worker', company_id: company.id } });

      // Suppliers
      const sup1 = await prisma.supplier.create({ data: { company_name: 'UltraTech Cement Ltd', contact_person: 'Rajiv Mehta', phone: '+91 9812345678', email: 'sales@ultratech.com', gst_number: '33AACCU1234A1Z5', rating: 3, status: 'active', company_id: company.id } });
      const sup2 = await prisma.supplier.create({ data: { company_name: 'Tata Steel Distributors', contact_person: 'Anil Singh', phone: '+91 9823456789', email: 'orders@tatasteel.com', gst_number: '33AACCT5678B2Z3', rating: 3, status: 'active', company_id: company.id } });
      await prisma.supplier.create({ data: { company_name: 'ACC Concrete Solutions', contact_person: 'Deepak Jain', phone: '+91 9834567890', email: 'supply@acc.com', gst_number: '33AACCA9012C3Z1', rating: 2, status: 'active', company_id: company.id } });

      // Projects
      const projData = [
        { project_id: 'CC-PRJ-0001', project_name: 'Skyline Tower - Premium Apartments', client_name: 'Metro Housing Ltd.', client_phone: '+91 9944556677', client_email: 'projects@metrohousing.in', site_street: 'Plot 45, OMR Road', site_city: 'Chennai', site_state: 'Tamil Nadu', site_zip: '600096', location: 'OMR, Chennai', description: 'A premium 25-storey residential tower with 200 luxury apartments.', start_date: new Date('2024-01-15'), expected_end_date: new Date('2026-06-30'), contract_value: 55000000, budget: 45000000, total_expenses: 28000000, total_income: 35000000, payment_pending: 20000000, project_status: 'active', progress_percentage: 62, risk_level: 'low', health_score: 78, manager_id: manager.id, company_id: company.id, created_by: admin.id },
        { project_id: 'CC-PRJ-0002', project_name: 'GreenPark Commercial Hub', client_name: 'GreenPark Developers', client_phone: '+91 9955667788', site_city: 'Chennai', site_state: 'Tamil Nadu', location: 'Thoraipakkam, Chennai', description: 'Commercial office space development.', start_date: new Date('2024-06-01'), expected_end_date: new Date('2026-12-31'), contract_value: 100000000, budget: 80000000, total_expenses: 22000000, total_income: 50000000, payment_pending: 50000000, project_status: 'active', progress_percentage: 35, risk_level: 'medium', health_score: 65, manager_id: manager.id, company_id: company.id, created_by: admin.id },
        { project_id: 'CC-PRJ-0003', project_name: 'NH-44 Highway Bridge', client_name: 'NHAI', client_phone: '+91 9966778899', site_city: 'Vellore', site_state: 'Tamil Nadu', location: 'NH-44 near Vellore', description: '200-meter span bridge over Palar River.', start_date: new Date('2023-09-01'), expected_end_date: new Date('2025-03-31'), contract_value: 150000000, budget: 120000000, total_expenses: 95000000, total_income: 100000000, payment_pending: 50000000, project_status: 'delayed', progress_percentage: 72, risk_level: 'high', health_score: 45, manager_id: manager.id, company_id: company.id, created_by: admin.id },
        { project_id: 'CC-PRJ-0004', project_name: 'Lakeside Villa - Gated Community', client_name: 'Lakeside Realty', client_phone: '+91 9977889900', site_city: 'Chennai', site_state: 'Tamil Nadu', location: 'ECR, Chennai', description: '40 independent villas.', start_date: new Date('2025-02-01'), expected_end_date: new Date('2027-08-31'), contract_value: 200000000, budget: 160000000, project_status: 'planning', progress_percentage: 5, risk_level: 'low', health_score: 95, manager_id: manager.id, company_id: company.id, created_by: admin.id },
        { project_id: 'CC-PRJ-0005', project_name: 'City Mall Renovation', client_name: 'City Mall Pvt Ltd', client_phone: '+91 9988990011', site_city: 'Chennai', site_state: 'Tamil Nadu', location: 'Mount Road, Chennai', description: 'Complete renovation of 3-floor commercial mall.', start_date: new Date('2024-11-01'), expected_end_date: new Date('2025-09-30'), contract_value: 30000000, budget: 25000000, total_expenses: 24000000, total_income: 30000000, project_status: 'completed', progress_percentage: 100, risk_level: 'low', health_score: 100, manager_id: manager.id, company_id: company.id, created_by: admin.id },
      ];
      const projects = [];
      for (const p of projData) { projects.push(await prisma.project.create({ data: p })); }

      // Construction stages
      for (const project of projects) {
        const stagesData = CONSTRUCTION_STAGES.map((stage, idx) => {
          const thresh = (project.progress_percentage / 100) * CONSTRUCTION_STAGES.length;
          return { project_id: project.id, stage_name: stage, stage_order: idx, status: idx < Math.floor(thresh) ? 'completed' : idx < Math.ceil(thresh) ? 'in_progress' : 'not_started', completion_percentage: idx < Math.floor(thresh) ? 100 : idx < Math.ceil(thresh) ? Math.round((thresh - Math.floor(thresh)) * 100) : 0 };
        });
        await prisma.constructionStage.createMany({ data: stagesData });
      }

      // Tasks
      await prisma.task.createMany({ data: [
        { task_name: 'Foundation excavation', project_id: projects[0].id, assigned_worker_id: workerUser.id, priority: 'high', status: 'completed', completion_percentage: 100, start_date: new Date('2024-02-01'), end_date: new Date('2024-04-30'), created_by: manager.id },
        { task_name: 'Steel reinforcement - Floors 1-10', project_id: projects[0].id, priority: 'critical', status: 'in_progress', completion_percentage: 65, start_date: new Date('2024-09-01'), end_date: new Date('2025-01-31'), created_by: manager.id },
        { task_name: 'Electrical wiring - Phase 1', project_id: projects[0].id, assigned_worker_id: engineer.id, priority: 'high', status: 'in_progress', completion_percentage: 40, start_date: new Date('2025-01-01'), end_date: new Date('2025-06-30'), created_by: manager.id },
        { task_name: 'Site clearing and leveling', project_id: projects[1].id, priority: 'high', status: 'completed', completion_percentage: 100, start_date: new Date('2024-06-01'), end_date: new Date('2024-07-15'), created_by: manager.id },
        { task_name: 'Bridge pier construction', project_id: projects[2].id, priority: 'critical', status: 'in_progress', completion_percentage: 55, start_date: new Date('2023-11-01'), end_date: new Date('2024-12-31'), created_by: manager.id },
        { task_name: 'Site survey and planning', project_id: projects[3].id, priority: 'high', status: 'in_progress', completion_percentage: 50, start_date: new Date('2025-02-01'), end_date: new Date('2025-04-30'), created_by: manager.id },
      ]});

      // Materials
      await prisma.material.createMany({ data: [
        { material_name: 'OPC Cement 53 Grade', category: 'Cement', supplier: 'UltraTech', supplier_id: sup1.id, quantity: 5000, unit: 'bags', available_stock: 1200, used_stock: 3800, cost: 380, total_purchased: 5000, total_issued: 3800, low_stock_threshold: 500, project_id: projects[0].id, company_id: company.id },
        { material_name: 'TMT Steel Bars 12mm', category: 'Steel', supplier: 'Tata Steel', supplier_id: sup2.id, quantity: 200, unit: 'tonnes', available_stock: 45, used_stock: 155, cost: 55000, total_purchased: 200, total_issued: 155, low_stock_threshold: 30, project_id: projects[0].id, company_id: company.id },
        { material_name: 'M25 Ready Mix Concrete', category: 'Concrete', supplier: 'ACC', quantity: 3000, unit: 'cubic meters', available_stock: 800, used_stock: 2200, cost: 5500, total_purchased: 3000, total_issued: 2200, low_stock_threshold: 200, project_id: projects[0].id, company_id: company.id },
        { material_name: 'Red Bricks - First Quality', category: 'Bricks', supplier: 'Local Supplier', quantity: 100000, unit: 'pieces', available_stock: 35000, used_stock: 65000, cost: 8, total_purchased: 100000, total_issued: 65000, low_stock_threshold: 10000, project_id: projects[0].id, company_id: company.id },
      ]});

      // Workers
      await prisma.worker.createMany({ data: [
        { worker_id: 'CC-WRK-0001', name: 'Ramesh Yadav', skill: 'Mason', specialization: 'Brick & Block Work', experience: 8, salary: 800, salary_type: 'daily', availability: 'assigned', assigned_project_id: projects[0].id, phone: '9876543214', joining_date: new Date('2022-03-15'), total_days_present: 450, total_earnings: 360000, productivity_score: 85, performance_rating: 4.2, company_id: company.id, user_id: workerUser.id },
        { worker_id: 'CC-WRK-0002', name: 'Sunil Kumar', skill: 'Welder', specialization: 'Structural Welding', experience: 12, salary: 1000, salary_type: 'daily', availability: 'assigned', assigned_project_id: projects[0].id, phone: '9876543215', total_days_present: 680, total_earnings: 680000, productivity_score: 92, performance_rating: 4.7, company_id: company.id },
        { worker_id: 'CC-WRK-0003', name: 'Deepak Sharma', skill: 'Plumber', specialization: 'PVC & CPVC Fitting', experience: 5, salary: 850, salary_type: 'daily', availability: 'available', phone: '9876543216', total_days_present: 320, total_earnings: 272000, productivity_score: 78, performance_rating: 3.8, company_id: company.id },
        { worker_id: 'CC-WRK-0004', name: 'Rajan M', skill: 'Electrician', specialization: 'Industrial Wiring', experience: 10, salary: 950, salary_type: 'daily', availability: 'assigned', assigned_project_id: projects[0].id, phone: '9876543217', total_days_present: 520, total_earnings: 494000, productivity_score: 88, performance_rating: 4.4, company_id: company.id },
        { worker_id: 'CC-WRK-0005', name: 'Venkatesh R', skill: 'Crane Operator', experience: 15, salary: 1200, salary_type: 'daily', availability: 'assigned', assigned_project_id: projects[0].id, phone: '9876543218', total_days_present: 400, total_earnings: 480000, productivity_score: 90, performance_rating: 4.5, company_id: company.id },
      ]});

      // Expenses
      await prisma.expense.createMany({ data: [
        { project_id: projects[0].id, category: 'Material', description: 'Cement purchase - 5000 bags', amount: 1900000, date: new Date('2024-01-20'), approved_status: 'approved', approved_by: admin.id, created_by: manager.id, company_id: company.id },
        { project_id: projects[0].id, category: 'Material', description: 'TMT Steel Bars - 200 tonnes', amount: 11000000, date: new Date('2024-02-01'), approved_status: 'approved', approved_by: admin.id, created_by: manager.id, company_id: company.id },
        { project_id: projects[0].id, category: 'Labor', description: 'Worker wages - Jan to Jun 2024', amount: 2700000, date: new Date('2024-06-30'), approved_status: 'approved', approved_by: admin.id, created_by: manager.id, company_id: company.id },
        { project_id: projects[1].id, category: 'Material', description: 'Steel reinforcement for foundation', amount: 5500000, date: new Date('2024-10-15'), approved_status: 'approved', approved_by: admin.id, created_by: manager.id, company_id: company.id },
        { project_id: projects[2].id, category: 'Material', description: 'Pre-stressed concrete for bridge deck', amount: 15000000, date: new Date('2024-08-20'), approved_status: 'approved', approved_by: admin.id, created_by: manager.id, company_id: company.id },
      ]});

      // Payments
      await prisma.payment.createMany({ data: [
        { project_id: projects[0].id, type: 'income', category: 'Client Payment', description: 'Advance payment - Skyline Tower', amount: 15000000, date: new Date('2024-01-10'), payment_mode: 'bank_transfer', reference_number: 'NEFT-2024-001', party_name: 'Metro Housing Ltd.', status: 'completed', created_by: admin.id, company_id: company.id },
        { project_id: projects[0].id, type: 'income', category: 'Milestone Payment', description: 'Foundation completion milestone', amount: 10000000, date: new Date('2024-05-15'), payment_mode: 'cheque', party_name: 'Metro Housing Ltd.', status: 'completed', created_by: admin.id, company_id: company.id },
        { project_id: projects[1].id, type: 'income', category: 'Advance', description: 'Initial advance - GreenPark', amount: 25000000, date: new Date('2024-05-25'), payment_mode: 'bank_transfer', party_name: 'GreenPark Developers', status: 'completed', created_by: admin.id, company_id: company.id },
        { project_id: projects[2].id, type: 'income', category: 'Govt Payment', description: 'NHAI interim payment', amount: 50000000, date: new Date('2024-04-01'), payment_mode: 'bank_transfer', party_name: 'NHAI', status: 'completed', created_by: admin.id, company_id: company.id },
      ]});

      // Equipment
      await prisma.equipment.createMany({ data: [
        { equipment_name: 'Tower Crane TC-500', type: 'Crane', model_number: 'TC-500A', serial_number: 'CR2024001', purchase_date: new Date('2022-06-15'), purchase_cost: 8500000, assigned_project_id: projects[0].id, availability: 'in_use', condition: 'good', cost_per_day: 15000, total_hours_used: 4200, next_maintenance: new Date('2025-08-15'), company_id: company.id },
        { equipment_name: 'Excavator CAT 320', type: 'Excavator', model_number: 'CAT-320D', serial_number: 'EX2023005', purchase_cost: 6500000, assigned_project_id: projects[1].id, availability: 'in_use', condition: 'good', cost_per_day: 12000, total_hours_used: 2800, company_id: company.id },
        { equipment_name: 'Concrete Mixer - 10/7 CFT', type: 'Mixer', model_number: 'CM-107', serial_number: 'MX2024010', purchase_cost: 350000, availability: 'available', condition: 'excellent', cost_per_day: 3000, total_hours_used: 800, company_id: company.id },
      ]});

      console.log('âœ… City Constructions seed complete!');
      console.log('   Admin: admin@cityconstructions.in / admin123');
      console.log('   Manager: manager@cityconstructions.in / manager123');
      console.log('   Engineer: engineer@cityconstructions.in / engineer123');
      console.log('   Worker: worker@cityconstructions.in / worker123');
    }
  } catch (seedErr) {
    console.warn('âš ï¸  Seed check:', seedErr.message);
  }
};
initDB();


const app = express();
const server = http.createServer(app);

// CORS â€” build allowed origins from CLIENT_URL + known production URLs
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://city-client.vercel.app",
  "https://city-client-mgr2.vercel.app",
];
if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (typeof origin === 'string' && (origin.endsWith('.vercel.app') || origin.includes('vercel.app'))) return true;
  return false;
};

// Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});
global.io = io;
setupSocket(io);
// BIM Design Studio real-time collaboration
const initBIMSockets = require('./sockets/bimSocket');
initBIMSockets(io);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn(`âš ï¸ CORS rejected origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Gzip compression for responses
app.use(compression());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API response time logging
app.use((req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    originalEnd.apply(res, args);
  };
  next();
});

// Security: SQL injection is handled by Prisma's parameterized queries

// Security: XSS attack prevention
app.use(xss());

// Security: Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests per windowMs
  message: { message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check â€” reports actual database connection status
app.get('/api/health', (_req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    status: dbStatus.connected ? 'ok' : 'degraded',
    database: dbStatus.status,
    databaseHost: dbStatus.host,
    databaseName: dbStatus.name,
    app: 'City Constructions ERP',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/stages', require('./routes/stages'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/dpr', require('./routes/dpr'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-log', require('./routes/auditLog'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/activities', require('./routes/activity'));

// BIM Design Studio routes
app.use('/api/bim/projects', require('./routes/bim/bimProjects'));
app.use('/api/bim/buildings', require('./routes/bim/buildings'));
app.use('/api/bim/floors', require('./routes/bim/floors'));
app.use('/api/bim/elements', require('./routes/bim/elements'));
app.use('/api/bim/materials', require('./routes/bim/materialLibrary'));
app.use('/api/bim/cost-estimation', require('./routes/bim/costEstimation'));
app.use('/api/bim/collab', require('./routes/bim/designCollab'));
app.use('/api/bim/exports', require('./routes/bim/exports'));
app.use('/api/bim/analytics', require('./routes/bim/bimAnalytics'));
app.use('/api/bim/structural', require('./routes/bim/structural'));
app.use('/api/bim/mep', require('./routes/bim/mep'));
app.use('/api/bim/import', require('./routes/bim/import'));
app.use('/api/bim/ai', require('./routes/bim/aiArchitect'));
app.use('/api/bim/virtual-tour', require('./routes/bim/virtualTour'));
app.use('/api/bim/bonsai', require('./routes/bim/bonsai'));
app.use('/api/bim/commands', require('./routes/bim/bimCommands'));

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`ðŸ—ï¸  City Constructions ERP running on port ${PORT}`);
  console.log(`ðŸ“¡ Socket.io ready`);
  console.log(`ðŸŒ Health check: http://localhost:${PORT}/api/health`);
});

module.exports = { app, server, io };
