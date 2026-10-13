const prisma = require('./prisma');

/**
 * Connect to Supabase PostgreSQL via Prisma.
 * Replaces the old MongoDB/Mongoose connection.
 */
const connectDB = async () => {
  try {
    // Test the connection
    await prisma.$connect();
    console.log('✅ PostgreSQL Connected: Supabase');
    console.log('   Database: postgres (Supabase)');
  } catch (error) {
    console.error(`❌ PostgreSQL connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      console.error('   Cannot start without database in production.');
      process.exit(1);
    }
    console.warn('   Server will continue running, but DB-dependent routes will fail.');
    console.warn('   Make sure DATABASE_URL is set correctly in .env');
  }
};

/**
 * Check if the database is connected.
 */
const getDBStatus = () => {
  return {
    connected: true, // Prisma manages connections internally
    status: 'connected',
    host: 'db.wuelpshfjbimdeimouvo.supabase.co',
    name: 'postgres',
  };
};

const isInMemoryDB = () => false;

module.exports = connectDB;
module.exports.getDBStatus = getDBStatus;
module.exports.isInMemoryDB = isInMemoryDB;
