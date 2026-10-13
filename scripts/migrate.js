#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════
 * CITY CONSTRUCTIONS ERP — MongoDB Atlas Migration Script
 * ═══════════════════════════════════════════════════════════
 *
 * Safe migration script that:
 * 1. Connects to MongoDB Atlas
 * 2. Validates the connection
 * 3. Reports existing collections/documents
 * 4. Optionally seeds demo data if database is empty
 *
 * Usage:
 *   npm run migrate           → Report status only
 *   npm run migrate -- --seed → Seed demo data if empty
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { getDBStatus } = require('../config/db');

const COLLECTIONS_TO_CHECK = [
  { name: 'User', model: () => require('../models/User') },
  { name: 'Company', model: () => require('../models/Company') },
  { name: 'Project', model: () => require('../models/Project') },
  { name: 'Task', model: () => require('../models/Task') },
  { name: 'Worker', model: () => require('../models/Worker') },
  { name: 'Material', model: () => require('../models/Material') },
  { name: 'Equipment', model: () => require('../models/Equipment') },
  { name: 'Expense', model: () => require('../models/Expense') },
  { name: 'ConstructionStage', model: () => require('../models/ConstructionStage') },
  { name: 'Supplier', model: () => require('../models/Supplier') },
  { name: 'Payment', model: () => require('../models/Payment') },
  { name: 'Attendance', model: () => require('../models/Attendance') },
  { name: 'Notification', model: () => require('../models/Notification') },
  { name: 'BIMProject', model: () => require('../models/bim/BIMProject') },
];

async function migrate() {
  const args = process.argv.slice(2);
  const shouldSeed = args.includes('--seed');

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CITY CONSTRUCTIONS ERP — MongoDB Migration Tool');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Check environment
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  if (!uri || uri.trim() === '') {
    console.error('❌ No MONGODB_URI found in .env file.');
    console.error('   Set MONGODB_URI to your MongoDB Atlas connection string.');
    console.error('   Format: mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>');
    process.exit(1);
  }

  const isAtlas = uri.includes('mongodb+srv') || uri.includes('mongodb.net');
  console.log(`📍 Connection Type: ${isAtlas ? 'MongoDB Atlas' : 'Direct MongoDB'}`);
  console.log(`📍 URI: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@')}`);
  console.log('');

  // Connect
  try {
    await connectDB();
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
    process.exit(1);
  }

  const dbStatus = getDBStatus();
  if (!dbStatus.connected) {
    console.error('❌ Database is not connected.');
    process.exit(1);
  }

  console.log(`✅ Connected to: ${dbStatus.host}`);
  console.log(`   Database: ${dbStatus.name}`);
  console.log('');

  // Report collections
  console.log('📊 Collection Status:');
  console.log('─────────────────────────────────────────');
  let totalDocs = 0;
  let isEmpty = true;

  for (const col of COLLECTIONS_TO_CHECK) {
    try {
      const Model = col.model();
      const count = await Model.countDocuments();
      totalDocs += count;
      if (count > 0) isEmpty = false;
      const status = count > 0 ? `✅ ${count} documents` : '📭 empty';
      console.log(`   ${col.name.padEnd(22)} ${status}`);
    } catch (err) {
      console.log(`   ${col.name.padEnd(22)} ⚠️  ${err.message}`);
    }
  }

  console.log('─────────────────────────────────────────');
  console.log(`   Total documents: ${totalDocs}`);
  console.log('');

  // Seed if requested and empty
  if (shouldSeed) {
    if (!isEmpty) {
      console.log('ℹ️  Database already has data. Skipping seed.');
      console.log('   Use "npm run seed -- --force" to wipe and reseed.');
    } else {
      console.log('🌱 Seeding demo data...');
      try {
        // Run the seed script's logic
        require('../seeds/seed');
        // The seed script will exit on its own
        return;
      } catch (err) {
        console.error('❌ Seed failed:', err.message);
      }
    }
  } else if (isEmpty) {
    console.log('💡 Database is empty. Run with --seed to populate demo data:');
    console.log('   npm run migrate -- --seed');
  }

  console.log('');
  console.log('✅ Migration check complete.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
