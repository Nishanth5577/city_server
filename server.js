require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/error');
const setupSocket = require('./services/socketService');

// Connect to MongoDB and seed if in-memory
const initDB = async () => {
  await connectDB();
  // Auto-seed for in-memory DB
  if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === '') {
    const User = require('./models/User');
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('🌱 Auto-seeding City Constructions database...');
      try {
        const Company = require('./models/Company');
        const Project = require('./models/Project');
        const Task = require('./models/Task');
        const ConstructionStage = require('./models/ConstructionStage');
        const Material = require('./models/Material');
        const Equipment = require('./models/Equipment');
        const Worker = require('./models/Worker');
        const Expense = require('./models/Expense');
        const Supplier = require('./models/Supplier');
        const Payment = require('./models/Payment');
        const { CONSTRUCTION_STAGES } = require('./utils/constants');

        // ═══════════════════════════════════════════════
        // CITY CONSTRUCTIONS - Seed Data
        // ═══════════════════════════════════════════════

        const admin = await User.create({ name: 'Karthikeyan S', email: 'admin@cityconstructions.in', password: 'admin123', role: 'admin', phone: '+91 9876543210' });
        const company = await Company.create({
          company_name: 'City Constructions',
          owner: admin._id,
          address: { street: '15, Anna Nagar Main Road', city: 'Chennai', state: 'Tamil Nadu', zip: '600040', country: 'India' },
          contact: { phone: '+91 44 2345 6789', email: 'info@cityconstructions.in' },
        });
        admin.company_id = company._id; await admin.save();

        const manager = await User.create({ name: 'Priya Sharma', email: 'manager@cityconstructions.in', password: 'manager123', role: 'project_manager', phone: '+91 9876543211', company_id: company._id });
        const engineer = await User.create({ name: 'Amit Patel', email: 'engineer@cityconstructions.in', password: 'engineer123', role: 'engineer', company_id: company._id });
        const supervisor = await User.create({ name: 'Suresh Kumar', email: 'supervisor@cityconstructions.in', password: 'supervisor123', role: 'supervisor', company_id: company._id });
        const workerUser = await User.create({ name: 'Ramesh Yadav', email: 'worker@cityconstructions.in', password: 'worker123', role: 'worker', company_id: company._id });

        // Suppliers
        const suppliers = await Supplier.create([
          { company_name: 'UltraTech Cement Ltd', contact_person: 'Rajiv Mehta', phone: '+91 9812345678', email: 'sales@ultratech.com', materials_supplied: ['Cement', 'Ready Mix'], gst_number: '33AACCU1234A1Z5', rating: 4.5, status: 'active', company_id: company._id },
          { company_name: 'Tata Steel Distributors', contact_person: 'Anil Singh', phone: '+91 9823456789', email: 'orders@tatasteel.com', materials_supplied: ['TMT Bars', 'Steel Plates'], gst_number: '33AACCT5678B2Z3', rating: 4.8, status: 'active', company_id: company._id },
          { company_name: 'ACC Concrete Solutions', contact_person: 'Deepak Jain', phone: '+91 9834567890', email: 'supply@acc.com', materials_supplied: ['Ready Mix Concrete', 'Blocks'], gst_number: '33AACCA9012C3Z1', rating: 4.2, status: 'active', company_id: company._id },
        ]);

        // Projects
        const projects = await Project.create([
          { project_id: 'CC-PRJ-0001', project_name: 'Skyline Tower - Premium Apartments', client_name: 'Metro Housing Ltd.', client_phone: '+91 9944556677', client_email: 'projects@metrohousing.in', site_address: { street: 'Plot 45, OMR Road', city: 'Chennai', state: 'Tamil Nadu', zip: '600096' }, location: 'OMR, Chennai', description: 'A premium 25-storey residential tower with 200 luxury apartments, swimming pool, clubhouse.', start_date: new Date('2024-01-15'), expected_end_date: new Date('2026-06-30'), contract_value: 55000000, budget: 45000000, total_expenses: 28000000, total_income: 35000000, payment_pending: 20000000, project_status: 'active', progress_percentage: 62, risk_level: 'low', health_score: 78, manager_id: manager._id, company_id: company._id, created_by: admin._id },
          { project_id: 'CC-PRJ-0002', project_name: 'GreenPark Commercial Hub', client_name: 'GreenPark Developers', client_phone: '+91 9955667788', client_email: 'info@greenpark.in', site_address: { street: '88, Thoraipakkam', city: 'Chennai', state: 'Tamil Nadu', zip: '600097' }, location: 'Thoraipakkam, Chennai', description: 'Commercial office space development with 5 floors and parking.', start_date: new Date('2024-06-01'), expected_end_date: new Date('2026-12-31'), contract_value: 100000000, budget: 80000000, total_expenses: 22000000, total_income: 50000000, payment_pending: 50000000, project_status: 'active', progress_percentage: 35, risk_level: 'medium', health_score: 65, manager_id: manager._id, company_id: company._id, created_by: admin._id },
          { project_id: 'CC-PRJ-0003', project_name: 'NH-44 Highway Bridge', client_name: 'NHAI', client_phone: '+91 9966778899', site_address: { street: 'KM 245, NH-44', city: 'Vellore', state: 'Tamil Nadu', zip: '632001' }, location: 'NH-44 near Vellore', description: 'Construction of a 200-meter span bridge over Palar River.', start_date: new Date('2023-09-01'), expected_end_date: new Date('2025-03-31'), contract_value: 150000000, budget: 120000000, total_expenses: 95000000, total_income: 100000000, payment_pending: 50000000, project_status: 'delayed', progress_percentage: 72, risk_level: 'high', health_score: 45, manager_id: manager._id, company_id: company._id, created_by: admin._id },
          { project_id: 'CC-PRJ-0004', project_name: 'Lakeside Villa - Gated Community', client_name: 'Lakeside Realty', client_phone: '+91 9977889900', site_address: { street: 'Survey No 12, ECR', city: 'Chennai', state: 'Tamil Nadu', zip: '603104' }, location: 'ECR, Chennai', description: '40 independent villas in a gated community with modern amenities.', start_date: new Date('2025-02-01'), expected_end_date: new Date('2027-08-31'), contract_value: 200000000, budget: 160000000, project_status: 'planning', progress_percentage: 5, risk_level: 'low', health_score: 95, manager_id: manager._id, company_id: company._id, created_by: admin._id },
          { project_id: 'CC-PRJ-0005', project_name: 'City Mall Renovation', client_name: 'City Mall Pvt Ltd', client_phone: '+91 9988990011', site_address: { street: 'Mount Road', city: 'Chennai', state: 'Tamil Nadu', zip: '600006' }, location: 'Mount Road, Chennai', description: 'Complete renovation of 3-floor commercial mall.', start_date: new Date('2024-11-01'), expected_end_date: new Date('2025-09-30'), contract_value: 30000000, budget: 25000000, total_expenses: 24000000, total_income: 30000000, project_status: 'completed', progress_percentage: 100, risk_level: 'low', health_score: 100, manager_id: manager._id, company_id: company._id, created_by: admin._id },
        ]);

        // Construction stages for each project
        for (const project of projects) {
          const stages = CONSTRUCTION_STAGES.map((stage, idx) => {
            const thresh = (project.progress_percentage / 100) * CONSTRUCTION_STAGES.length;
            return { project_id: project._id, stage_name: stage, stage_order: idx, status: idx < Math.floor(thresh) ? 'completed' : idx < Math.ceil(thresh) ? 'in_progress' : 'not_started', completion_percentage: idx < Math.floor(thresh) ? 100 : idx < Math.ceil(thresh) ? Math.round((thresh - Math.floor(thresh)) * 100) : 0 };
          });
          await ConstructionStage.insertMany(stages);
        }

        // Tasks
        await Task.create([
          { task_name: 'Foundation excavation', project_id: projects[0]._id, assigned_worker: workerUser._id, priority: 'high', status: 'completed', completion_percentage: 100, start_date: new Date('2024-02-01'), end_date: new Date('2024-04-30'), created_by: manager._id },
          { task_name: 'Steel reinforcement - Floors 1-10', project_id: projects[0]._id, priority: 'critical', status: 'in_progress', completion_percentage: 65, start_date: new Date('2024-09-01'), end_date: new Date('2025-01-31'), created_by: manager._id },
          { task_name: 'Electrical wiring - Phase 1', project_id: projects[0]._id, assigned_worker: engineer._id, priority: 'high', status: 'in_progress', completion_percentage: 40, start_date: new Date('2025-01-01'), end_date: new Date('2025-06-30'), created_by: manager._id },
          { task_name: 'Plumbing installation - Basement', project_id: projects[0]._id, priority: 'medium', status: 'pending', completion_percentage: 0, start_date: new Date('2025-02-01'), end_date: new Date('2025-08-31'), created_by: manager._id },
          { task_name: 'Brick work - Ground floor', project_id: projects[0]._id, priority: 'high', status: 'in_progress', completion_percentage: 30, start_date: new Date('2025-03-01'), end_date: new Date('2025-07-31'), created_by: manager._id },
          { task_name: 'Site clearing and leveling', project_id: projects[1]._id, priority: 'high', status: 'completed', completion_percentage: 100, start_date: new Date('2024-06-01'), end_date: new Date('2024-07-15'), created_by: manager._id },
          { task_name: 'Foundation work - Block A', project_id: projects[1]._id, priority: 'critical', status: 'in_progress', completion_percentage: 55, start_date: new Date('2024-08-01'), end_date: new Date('2025-02-28'), created_by: manager._id },
          { task_name: 'Bridge pier construction', project_id: projects[2]._id, priority: 'critical', status: 'in_progress', completion_percentage: 55, start_date: new Date('2023-11-01'), end_date: new Date('2024-12-31'), created_by: manager._id },
          { task_name: 'Deck slab casting', project_id: projects[2]._id, priority: 'high', status: 'pending', completion_percentage: 0, start_date: new Date('2025-01-01'), end_date: new Date('2025-06-30'), created_by: manager._id },
          { task_name: 'Site survey and planning', project_id: projects[3]._id, priority: 'high', status: 'in_progress', completion_percentage: 50, start_date: new Date('2025-02-01'), end_date: new Date('2025-04-30'), created_by: manager._id },
        ]);

        // Materials with transactions
        await Material.create([
          { material_name: 'OPC Cement 53 Grade', category: 'Cement', supplier: 'UltraTech', supplier_id: suppliers[0]._id, quantity: 5000, unit: 'bags', available_stock: 1200, used_stock: 3800, cost: 380, total_purchased: 5000, total_issued: 3800, total_returned: 0, low_stock_threshold: 500, project_id: projects[0]._id, company_id: company._id, transactions: [{ type: 'purchase', quantity: 5000, unit_price: 380, total_amount: 1900000, supplier_id: suppliers[0]._id, date: new Date('2024-01-20'), created_by: manager._id }, { type: 'issue', quantity: 2000, issued_to: 'Foundation work', date: new Date('2024-03-10'), created_by: engineer._id }, { type: 'issue', quantity: 1800, issued_to: 'Structure work', date: new Date('2024-09-15'), created_by: engineer._id }] },
          { material_name: 'TMT Steel Bars 12mm', category: 'Steel', supplier: 'Tata Steel', supplier_id: suppliers[1]._id, quantity: 200, unit: 'tonnes', available_stock: 45, used_stock: 155, cost: 55000, total_purchased: 200, total_issued: 155, total_returned: 0, low_stock_threshold: 30, project_id: projects[0]._id, company_id: company._id, transactions: [{ type: 'purchase', quantity: 200, unit_price: 55000, total_amount: 11000000, supplier_id: suppliers[1]._id, date: new Date('2024-02-01'), created_by: manager._id }, { type: 'issue', quantity: 155, issued_to: 'Structural reinforcement', date: new Date('2024-06-20'), created_by: engineer._id }] },
          { material_name: 'M25 Ready Mix Concrete', category: 'Concrete', supplier: 'ACC', supplier_id: suppliers[2]._id, quantity: 3000, unit: 'cubic meters', available_stock: 800, used_stock: 2200, cost: 5500, total_purchased: 3000, total_issued: 2200, total_returned: 0, low_stock_threshold: 200, project_id: projects[0]._id, company_id: company._id },
          { material_name: 'Red Bricks - First Quality', category: 'Bricks', supplier: 'Local Supplier', quantity: 100000, unit: 'pieces', available_stock: 35000, used_stock: 65000, cost: 8, total_purchased: 100000, total_issued: 65000, low_stock_threshold: 10000, project_id: projects[0]._id, company_id: company._id },
          { material_name: 'River Sand - Fine Grade', category: 'Sand', supplier: 'Local Supplier', quantity: 500, unit: 'cubic meters', available_stock: 120, used_stock: 380, cost: 2200, total_purchased: 500, total_issued: 380, low_stock_threshold: 50, project_id: projects[0]._id, company_id: company._id },
        ]);

        // Equipment
        await Equipment.create([
          { equipment_name: 'Tower Crane TC-500', type: 'Crane', model_number: 'TC-500A', serial_number: 'CR2024001', purchase_date: new Date('2022-06-15'), purchase_cost: 8500000, assigned_project: projects[0]._id, operator: 'Rajan', availability: 'in_use', condition: 'good', cost_per_day: 15000, total_hours_used: 4200, next_maintenance: new Date('2025-08-15'), maintenance_interval_days: 90, company_id: company._id },
          { equipment_name: 'Excavator CAT 320', type: 'Excavator', model_number: 'CAT-320D', serial_number: 'EX2023005', purchase_date: new Date('2023-01-10'), purchase_cost: 6500000, assigned_project: projects[1]._id, operator: 'Venkat', availability: 'in_use', condition: 'good', cost_per_day: 12000, total_hours_used: 2800, next_maintenance: new Date('2025-07-20'), company_id: company._id },
          { equipment_name: 'Concrete Mixer - 10/7 CFT', type: 'Mixer', model_number: 'CM-107', serial_number: 'MX2024010', purchase_date: new Date('2024-03-01'), purchase_cost: 350000, availability: 'available', condition: 'excellent', cost_per_day: 3000, total_hours_used: 800, company_id: company._id },
          { equipment_name: 'JCB 3DX Backhoe Loader', type: 'Loader', model_number: 'JCB-3DX', serial_number: 'JCB2023020', availability: 'maintenance', condition: 'fair', cost_per_day: 8000, next_maintenance: new Date('2025-07-01'), company_id: company._id },
        ]);

        // Workers
        await Worker.create([
          { worker_id: 'CC-WRK-0001', name: 'Ramesh Yadav', skill: 'Mason', specialization: 'Brick & Block Work', experience: 8, salary: 800, salary_type: 'daily', availability: 'assigned', assigned_project: projects[0]._id, phone: '9876543214', joining_date: new Date('2022-03-15'), total_days_present: 450, total_earnings: 360000, productivity_score: 85, performance_rating: 4.2, company_id: company._id, user_id: workerUser._id },
          { worker_id: 'CC-WRK-0002', name: 'Sunil Kumar', skill: 'Welder', specialization: 'Structural Welding', experience: 12, salary: 1000, salary_type: 'daily', availability: 'assigned', assigned_project: projects[0]._id, phone: '9876543215', joining_date: new Date('2021-06-01'), total_days_present: 680, total_earnings: 680000, productivity_score: 92, performance_rating: 4.7, company_id: company._id },
          { worker_id: 'CC-WRK-0003', name: 'Deepak Sharma', skill: 'Plumber', specialization: 'PVC & CPVC Fitting', experience: 5, salary: 850, salary_type: 'daily', availability: 'available', phone: '9876543216', joining_date: new Date('2023-01-10'), total_days_present: 320, total_earnings: 272000, productivity_score: 78, performance_rating: 3.8, company_id: company._id },
          { worker_id: 'CC-WRK-0004', name: 'Rajan M', skill: 'Electrician', specialization: 'Industrial Wiring', experience: 10, salary: 950, salary_type: 'daily', availability: 'assigned', assigned_project: projects[0]._id, phone: '9876543217', total_days_present: 520, total_earnings: 494000, productivity_score: 88, performance_rating: 4.4, company_id: company._id },
          { worker_id: 'CC-WRK-0005', name: 'Venkatesh R', skill: 'Crane Operator', specialization: 'Tower Crane', experience: 15, salary: 1200, salary_type: 'daily', availability: 'assigned', assigned_project: projects[0]._id, phone: '9876543218', total_days_present: 400, total_earnings: 480000, productivity_score: 90, performance_rating: 4.5, company_id: company._id },
          { worker_id: 'CC-WRK-0006', name: 'Murugan K', skill: 'Painter', specialization: 'Interior & Exterior', experience: 7, salary: 750, salary_type: 'daily', availability: 'available', phone: '9876543219', total_days_present: 280, total_earnings: 210000, productivity_score: 75, performance_rating: 3.6, company_id: company._id },
          { worker_id: 'CC-WRK-0007', name: 'Arjun S', skill: 'Carpenter', specialization: 'Shuttering & Formwork', experience: 6, salary: 900, salary_type: 'daily', availability: 'assigned', assigned_project: projects[1]._id, phone: '9876543220', total_days_present: 350, total_earnings: 315000, productivity_score: 82, performance_rating: 4.0, company_id: company._id },
          { worker_id: 'CC-WRK-0008', name: 'Bala K', skill: 'Helper', experience: 2, salary: 500, salary_type: 'daily', availability: 'assigned', assigned_project: projects[2]._id, phone: '9876543221', total_days_present: 200, total_earnings: 100000, productivity_score: 70, performance_rating: 3.4, company_id: company._id },
        ]);

        // Expenses
        await Expense.create([
          { project_id: projects[0]._id, category: 'Material', description: 'Cement purchase - 5000 bags from UltraTech', amount: 1900000, date: new Date('2024-01-20'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
          { project_id: projects[0]._id, category: 'Material', description: 'TMT Steel Bars - 200 tonnes from Tata Steel', amount: 11000000, date: new Date('2024-02-01'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
          { project_id: projects[0]._id, category: 'Labor', description: 'Worker wages - Jan to Jun 2024', amount: 2700000, date: new Date('2024-06-30'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
          { project_id: projects[0]._id, category: 'Equipment', description: 'Tower crane rental - Q1-Q2 2024', amount: 2700000, date: new Date('2024-06-30'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
          { project_id: projects[1]._id, category: 'Material', description: 'Steel reinforcement for foundation', amount: 5500000, date: new Date('2024-10-15'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
          { project_id: projects[1]._id, category: 'Labor', description: 'Worker wages - Jul to Dec 2024', amount: 3200000, date: new Date('2024-12-31'), approved_status: 'pending', created_by: manager._id, company_id: company._id },
          { project_id: projects[2]._id, category: 'Material', description: 'Pre-stressed concrete for bridge deck', amount: 15000000, date: new Date('2024-08-20'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
          { project_id: projects[2]._id, category: 'Equipment', description: 'Pile driving equipment rental', amount: 4500000, date: new Date('2024-03-15'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
        ]);

        // Payments (Income entries)
        await Payment.create([
          { project_id: projects[0]._id, type: 'income', category: 'Client Payment', description: 'Advance payment - Skyline Tower', amount: 15000000, date: new Date('2024-01-10'), payment_mode: 'bank_transfer', reference_number: 'NEFT-2024-001', party_name: 'Metro Housing Ltd.', status: 'completed', created_by: admin._id, company_id: company._id },
          { project_id: projects[0]._id, type: 'income', category: 'Milestone Payment', description: 'Foundation completion milestone', amount: 10000000, date: new Date('2024-05-15'), payment_mode: 'cheque', reference_number: 'CHQ-MHL-4567', party_name: 'Metro Housing Ltd.', status: 'completed', created_by: admin._id, company_id: company._id },
          { project_id: projects[0]._id, type: 'income', category: 'Milestone Payment', description: 'Structure completion - 50%', amount: 10000000, date: new Date('2024-12-20'), payment_mode: 'bank_transfer', party_name: 'Metro Housing Ltd.', status: 'completed', created_by: admin._id, company_id: company._id },
          { project_id: projects[1]._id, type: 'income', category: 'Advance', description: 'Initial advance - GreenPark', amount: 25000000, date: new Date('2024-05-25'), payment_mode: 'bank_transfer', party_name: 'GreenPark Developers', status: 'completed', created_by: admin._id, company_id: company._id },
          { project_id: projects[1]._id, type: 'income', category: 'Milestone Payment', description: 'Site preparation completion', amount: 25000000, date: new Date('2024-09-10'), payment_mode: 'bank_transfer', party_name: 'GreenPark Developers', status: 'completed', created_by: admin._id, company_id: company._id },
          { project_id: projects[2]._id, type: 'income', category: 'Govt Payment', description: 'NHAI interim payment', amount: 50000000, date: new Date('2024-04-01'), payment_mode: 'bank_transfer', party_name: 'NHAI', status: 'completed', created_by: admin._id, company_id: company._id },
          { project_id: projects[2]._id, type: 'income', category: 'Govt Payment', description: 'NHAI milestone - pier completion', amount: 50000000, date: new Date('2024-11-15'), payment_mode: 'bank_transfer', party_name: 'NHAI', status: 'completed', created_by: admin._id, company_id: company._id },
          { project_id: projects[4]._id, type: 'income', category: 'Final Payment', description: 'City Mall renovation - final settlement', amount: 30000000, date: new Date('2025-09-30'), payment_mode: 'bank_transfer', party_name: 'City Mall Pvt Ltd', status: 'completed', created_by: admin._id, company_id: company._id },
        ]);

        console.log('✅ City Constructions seed complete!');
        console.log('   Admin: admin@cityconstructions.in / admin123');
        console.log('   Manager: manager@cityconstructions.in / manager123');
        console.log('   Engineer: engineer@cityconstructions.in / engineer123');
        console.log('   Supervisor: supervisor@cityconstructions.in / supervisor123');
        console.log('   Worker: worker@cityconstructions.in / worker123');
      } catch (seedErr) {
        console.error('⚠️ Auto-seed failed:', seedErr.message);
      }
    }
  }
};
initDB();

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://city-client.vercel.app",
      "https://city-client-mgr2.vercel.app"
    ],
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

// CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://city-client.vercel.app",
  "https://city-client-mgr2.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

// Security: Sanitize MongoDB queries (prevent NoSQL injection)
app.use(mongoSanitize());

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'City Constructions ERP', timestamp: new Date().toISOString(), version: '2.0.0' });
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

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🏗️  City Constructions ERP running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = { app, server, io };
