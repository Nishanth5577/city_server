require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Company = require('../models/Company');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ConstructionStage = require('../models/ConstructionStage');
const Material = require('../models/Material');
const Equipment = require('../models/Equipment');
const Worker = require('../models/Worker');
const Expense = require('../models/Expense');
const { CONSTRUCTION_STAGES } = require('../utils/constants');

const seed = async () => {
  try {
    await connectDB();
    console.log('🌱 Seeding database...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      ConstructionStage.deleteMany({}),
      Material.deleteMany({}),
      Equipment.deleteMany({}),
      Worker.deleteMany({}),
      Expense.deleteMany({}),
    ]);

    // Create admin user
    const admin = await User.create({
      name: 'Rajesh Kumar',
      email: 'admin@cityconstructions.in',
      password: 'admin123',
      role: 'admin',
      phone: '+91 9876543210',
    });

    // Create company
    const company = await Company.create({
      company_name: 'BuildMaster Construction Pvt. Ltd.',
      owner: admin._id,
      address: { street: '42 MG Road', city: 'Mumbai', state: 'Maharashtra', zip: '400001', country: 'India' },
      contact: { phone: '+91 22 2345 6789', email: 'info@buildmaster.com', website: 'https://buildmaster.com' },
      registration_details: { registration_number: 'BM2024001', gst_number: '27AABCB1234F1Z5' },
    });

    admin.company_id = company._id;
    await admin.save();

    // Create other users
    const manager = await User.create({ name: 'Priya Sharma', email: 'manager@cityconstructions.in', password: 'manager123', role: 'project_manager', phone: '+91 9876543211', company_id: company._id });
    const engineer = await User.create({ name: 'Amit Patel', email: 'engineer@cityconstructions.in', password: 'engineer123', role: 'engineer', phone: '+91 9876543212', company_id: company._id });
    const supervisor = await User.create({ name: 'Suresh Reddy', email: 'supervisor@cityconstructions.in', password: 'supervisor123', role: 'supervisor', phone: '+91 9876543213', company_id: company._id });
    const worker = await User.create({ name: 'Ramesh Yadav', email: 'worker@cityconstructions.in', password: 'worker123', role: 'worker', phone: '+91 9876543214', company_id: company._id });

    // Create projects
    const projects = await Project.create([
      {
        project_name: 'Skyline Tower - Residential Complex',
        client_name: 'Metro Housing Ltd.',
        location: 'Andheri East, Mumbai',
        description: 'A premium 25-storey residential tower with 200 apartments, modern amenities, and underground parking.',
        start_date: new Date('2024-01-15'),
        expected_end_date: new Date('2026-06-30'),
        budget: 45000000,
        project_status: 'active',
        progress_percentage: 62,
        manager_id: manager._id,
        company_id: company._id,
        created_by: admin._id,
        health_score: 78,
      },
      {
        project_name: 'GreenPark Commercial Hub',
        client_name: 'GreenPark Developers',
        location: 'Whitefield, Bangalore',
        description: 'Commercial office space development with 50,000 sqft of premium office space across 3 buildings.',
        start_date: new Date('2024-06-01'),
        expected_end_date: new Date('2026-12-31'),
        budget: 80000000,
        project_status: 'active',
        progress_percentage: 35,
        manager_id: manager._id,
        company_id: company._id,
        created_by: admin._id,
        health_score: 85,
      },
      {
        project_name: 'National Highway Bridge - NH44',
        client_name: 'NHAI',
        location: 'Hyderabad-Bangalore Highway',
        description: 'Construction of a 200-meter span bridge over Krishna River on NH44.',
        start_date: new Date('2023-09-01'),
        expected_end_date: new Date('2025-03-31'),
        budget: 120000000,
        project_status: 'delayed',
        progress_percentage: 72,
        manager_id: manager._id,
        company_id: company._id,
        created_by: admin._id,
        health_score: 45,
      },
    ]);

    // Create stages for each project
    for (const project of projects) {
      const stages = CONSTRUCTION_STAGES.map((stage, index) => {
        let status = 'not_started';
        let completion = 0;
        const progressThreshold = (project.progress_percentage / 100) * CONSTRUCTION_STAGES.length;

        if (index < Math.floor(progressThreshold)) {
          status = 'completed';
          completion = 100;
        } else if (index < Math.ceil(progressThreshold)) {
          status = 'in_progress';
          completion = Math.round((progressThreshold - Math.floor(progressThreshold)) * 100);
        }

        return {
          project_id: project._id,
          stage_name: stage,
          stage_order: index,
          status,
          completion_percentage: completion,
          updated_by: engineer._id,
        };
      });
      await ConstructionStage.insertMany(stages);
    }

    // Create tasks
    await Task.create([
      { task_name: 'Foundation excavation', description: 'Complete foundation excavation for Building A', project_id: projects[0]._id, assigned_worker: worker._id, priority: 'high', start_date: new Date('2024-02-01'), end_date: new Date('2024-04-30'), status: 'completed', completion_percentage: 100, created_by: manager._id },
      { task_name: 'Steel reinforcement installation', description: 'Install steel reinforcement for floors 1-5', project_id: projects[0]._id, assigned_worker: worker._id, priority: 'critical', start_date: new Date('2024-05-01'), end_date: new Date('2024-08-31'), status: 'completed', completion_percentage: 100, created_by: manager._id },
      { task_name: 'Electrical wiring - Phase 1', description: 'Complete electrical wiring for floors 1-10', project_id: projects[0]._id, assigned_worker: engineer._id, priority: 'high', start_date: new Date('2024-09-01'), end_date: new Date('2025-01-31'), status: 'in_progress', completion_percentage: 65, created_by: manager._id },
      { task_name: 'Plumbing installation', description: 'Complete plumbing work for all floors', project_id: projects[0]._id, priority: 'medium', start_date: new Date('2025-02-01'), end_date: new Date('2025-06-30'), status: 'pending', completion_percentage: 0, created_by: manager._id },
      { task_name: 'Site clearing and leveling', description: 'Clear and level the commercial hub site', project_id: projects[1]._id, assigned_worker: worker._id, priority: 'high', start_date: new Date('2024-06-15'), end_date: new Date('2024-08-15'), status: 'completed', completion_percentage: 100, created_by: manager._id },
      { task_name: 'Foundation work - Building B', description: 'Foundation construction for Building B', project_id: projects[1]._id, priority: 'high', start_date: new Date('2024-09-01'), end_date: new Date('2025-02-28'), status: 'in_progress', completion_percentage: 40, created_by: manager._id },
      { task_name: 'Bridge pier construction', description: 'Construct bridge piers 1-4', project_id: projects[2]._id, assigned_worker: worker._id, priority: 'critical', start_date: new Date('2024-01-01'), end_date: new Date('2024-10-31'), status: 'completed', completion_percentage: 100, created_by: manager._id },
      { task_name: 'Girder installation', description: 'Install pre-stressed concrete girders', project_id: projects[2]._id, priority: 'critical', start_date: new Date('2024-11-01'), end_date: new Date('2025-04-30'), status: 'in_progress', completion_percentage: 55, created_by: manager._id },
    ]);

    // Create materials
    await Material.create([
      { material_name: 'OPC Cement 53 Grade', category: 'Cement', supplier: 'UltraTech Cement', quantity: 5000, unit: 'bags', available_stock: 1200, used_stock: 3800, cost: 380, low_stock_threshold: 500, project_id: projects[0]._id, company_id: company._id },
      { material_name: 'TMT Steel Bars 12mm', category: 'Steel', supplier: 'Tata Steel', quantity: 200, unit: 'tonnes', available_stock: 45, used_stock: 155, cost: 55000, low_stock_threshold: 30, project_id: projects[0]._id, company_id: company._id },
      { material_name: 'M25 Ready Mix Concrete', category: 'Concrete', supplier: 'ACC Concrete', quantity: 3000, unit: 'cubic meters', available_stock: 800, used_stock: 2200, cost: 5500, low_stock_threshold: 200, project_id: projects[0]._id, company_id: company._id },
      { material_name: 'Red Bricks', category: 'Masonry', supplier: 'Local Brick Works', quantity: 100000, unit: 'pieces', available_stock: 15000, used_stock: 85000, cost: 8, low_stock_threshold: 10000, project_id: projects[0]._id, company_id: company._id },
      { material_name: 'River Sand', category: 'Aggregate', supplier: 'Krishna Aggregates', quantity: 500, unit: 'cubic meters', available_stock: 80, used_stock: 420, cost: 2500, low_stock_threshold: 50, project_id: projects[1]._id, company_id: company._id },
    ]);

    // Create equipment
    await Equipment.create([
      { equipment_name: 'Tower Crane TC-500', type: 'Crane', assigned_project: projects[0]._id, availability: 'in_use', maintenance_date: new Date('2025-08-15'), condition: 'good', cost_per_day: 15000, company_id: company._id },
      { equipment_name: 'Concrete Mixer CM-200', type: 'Mixer', assigned_project: projects[0]._id, availability: 'in_use', condition: 'excellent', cost_per_day: 5000, company_id: company._id },
      { equipment_name: 'Excavator CAT 320', type: 'Excavator', assigned_project: projects[1]._id, availability: 'in_use', maintenance_date: new Date('2025-07-01'), condition: 'good', cost_per_day: 12000, company_id: company._id },
      { equipment_name: 'Pile Driver HD-100', type: 'Pile Driver', availability: 'available', condition: 'fair', cost_per_day: 20000, company_id: company._id },
    ]);

    // Create workers
    await Worker.create([
      { name: 'Ramesh Yadav', skill: 'Mason', experience: 8, salary: 800, salary_type: 'daily', availability: 'assigned', assigned_project: projects[0]._id, phone: '9876543214', company_id: company._id, user_id: worker._id },
      { name: 'Sunil Kumar', skill: 'Welder', experience: 12, salary: 1000, salary_type: 'daily', availability: 'assigned', assigned_project: projects[0]._id, phone: '9876543215', company_id: company._id },
      { name: 'Manoj Singh', skill: 'Electrician', experience: 6, salary: 900, salary_type: 'daily', availability: 'assigned', assigned_project: projects[0]._id, phone: '9876543216', company_id: company._id },
      { name: 'Deepak Sharma', skill: 'Plumber', experience: 5, salary: 850, salary_type: 'daily', availability: 'available', phone: '9876543217', company_id: company._id },
      { name: 'Ravi Verma', skill: 'Carpenter', experience: 10, salary: 950, salary_type: 'daily', availability: 'assigned', assigned_project: projects[1]._id, phone: '9876543218', company_id: company._id },
    ]);

    // Create expenses
    await Expense.create([
      { project_id: projects[0]._id, category: 'Material', description: 'Cement purchase - 2000 bags', amount: 760000, date: new Date('2024-06-15'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
      { project_id: projects[0]._id, category: 'Labor', description: 'Worker wages - June 2024', amount: 450000, date: new Date('2024-06-30'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
      { project_id: projects[0]._id, category: 'Equipment', description: 'Tower crane rental - Q2', amount: 1350000, date: new Date('2024-06-30'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
      { project_id: projects[1]._id, category: 'Material', description: 'Steel reinforcement bars', amount: 2200000, date: new Date('2024-10-15'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
      { project_id: projects[1]._id, category: 'Subcontractor', description: 'Foundation excavation contract', amount: 1500000, date: new Date('2024-09-01'), approved_status: 'pending', created_by: manager._id, company_id: company._id },
      { project_id: projects[2]._id, category: 'Material', description: 'Pre-stressed concrete girders', amount: 8500000, date: new Date('2024-11-01'), approved_status: 'approved', approved_by: admin._id, created_by: manager._id, company_id: company._id },
    ]);

    console.log('✅ Seed data created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin:      admin@cityconstructions.in / admin123');
    console.log('Manager:    manager@cityconstructions.in / manager123');
    console.log('Engineer:   engineer@cityconstructions.in / engineer123');
    console.log('Supervisor: supervisor@cityconstructions.in / supervisor123');
    console.log('Worker:     worker@cityconstructions.in / worker123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
