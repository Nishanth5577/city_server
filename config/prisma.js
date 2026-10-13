/**
 * Prisma Client Singleton — City Constructions ERP
 * Configured for Prisma 7.x with @prisma/adapter-pg
 */

// Allow self-signed certificates (Supabase pooler in dev)
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

let prisma;

if (!global.__prisma) {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    pool: {
      max: 10,
      ssl: { rejectUnauthorized: false },
    },
  });
  prisma = new PrismaClient({ adapter });
  global.__prisma = prisma;
} else {
  prisma = global.__prisma;
}

module.exports = prisma;
