require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
  const client = await pool.connect();
  try {
    const res = await client.query("UPDATE projects SET project_status = 'active' WHERE project_status != 'active'");
    console.log(`✅ Updated ${res.rowCount} projects to active status`);
    const check = await client.query("SELECT id, project_name, project_status FROM projects");
    check.rows.forEach(r => console.log(`  ${r.project_name}: ${r.project_status}`));
  } finally { client.release(); await pool.end(); }
}
fix();
