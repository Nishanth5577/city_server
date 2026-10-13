// Seed sample data for project detail tabs
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function seed() {
  const client = await pool.connect();
  try {
    // Get projects and company/user IDs
    const projRes = await client.query('SELECT id, project_name, company_id, created_by FROM projects LIMIT 2');
    if (projRes.rows.length === 0) { console.log('No projects found'); return; }

    for (const proj of projRes.rows) {
      const pid = proj.id;
      const cid = proj.company_id;
      const uid = proj.created_by;
      console.log(`Seeding data for: ${proj.project_name} (${pid})`);

      // ─── TASKS ───
      const taskExists = await client.query('SELECT COUNT(*) FROM tasks WHERE project_id = $1', [pid]);
      if (parseInt(taskExists.rows[0].count) === 0) {
        const tasks = [
          ['Foundation Excavation', 'high', 'completed', 'Excavate foundation trenches as per structural drawing', '2025-02-15'],
          ['RCC Column Casting', 'high', 'completed', 'Cast all ground floor columns with M25 grade concrete', '2025-03-01'],
          ['First Floor Slab', 'high', 'in_progress', 'Shuttering, reinforcement & concrete pour for 1st floor', '2025-04-10'],
          ['Electrical Conduit Laying', 'medium', 'in_progress', 'Lay all electrical conduits before plastering', '2025-04-20'],
          ['Plumbing Rough-in', 'medium', 'pending', 'Complete all plumbing rough-in work for bathrooms', '2025-05-01'],
          ['Brickwork - Ground Floor', 'medium', 'completed', 'Complete all internal and external brickwork', '2025-03-15'],
          ['Plastering - Ground Floor', 'medium', 'in_progress', 'Internal plastering with 12mm CM 1:6', '2025-05-10'],
          ['Waterproofing - Bathrooms', 'high', 'pending', 'Apply waterproofing membrane in all wet areas', '2025-05-20'],
          ['Window & Door Frames', 'low', 'pending', 'Install all aluminum window and wooden door frames', '2025-06-01'],
          ['Site Cleanup & Inspection', 'low', 'pending', 'Final cleanup and structural inspection', '2025-06-15'],
        ];
        for (const [title, priority, status, desc, due] of tasks) {
          await client.query(
            `INSERT INTO tasks (id, title, description, status, priority, due_date, project_id, company_id, created_by, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [title, desc, status, priority, due, pid, cid, uid]
          );
        }
        console.log('  ✓ 10 tasks created');
      } else {
        console.log('  ✓ Tasks already exist');
      }

      // ─── EXPENSES ───
      const expExists = await client.query('SELECT COUNT(*) FROM expenses WHERE project_id = $1', [pid]);
      if (parseInt(expExists.rows[0].count) === 0) {
        const expenses = [
          ['Cement - 500 bags', 'material', 175000, 'UltraTech Dealers', '2025-01-20', 'approved'],
          ['TMT Steel - 10 tons', 'material', 520000, 'Tata Steel Distributors', '2025-01-25', 'approved'],
          ['Sand - 3 lorry loads', 'material', 45000, 'Local Sand Supplier', '2025-02-01', 'approved'],
          ['Excavation Labour', 'labour', 85000, 'KPN Earthworks', '2025-02-05', 'approved'],
          ['Ready Mix Concrete M25', 'material', 280000, 'ACC RMC Plant', '2025-02-20', 'approved'],
          ['Shuttering Material Rent', 'equipment', 65000, 'Siva Shuttering Works', '2025-03-01', 'approved'],
          ['Electrical Cables & Conduits', 'material', 120000, 'Havells Electricals', '2025-03-15', 'approved'],
          ['Mason & Helper Wages - Feb', 'labour', 180000, 'Direct Payment', '2025-02-28', 'approved'],
          ['Plumbing Pipes & Fittings', 'material', 95000, 'Supreme Pipes', '2025-03-20', 'pending'],
          ['Site Engineer Salary - Q1', 'labour', 150000, 'Direct Payment', '2025-03-31', 'approved'],
          ['Bricks - 20000 nos', 'material', 160000, 'Coimbatore Brick Works', '2025-02-10', 'approved'],
          ['Crane Rental - 5 days', 'equipment', 75000, 'SKR Cranes', '2025-03-10', 'approved'],
        ];
        for (const [desc, cat, amt, vendor, date, status] of expenses) {
          await client.query(
            `INSERT INTO expenses (id, description, category, amount, vendor, expense_date, status, project_id, company_id, created_by, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [desc, cat, amt, vendor, date, status, pid, cid, uid]
          );
        }
        console.log('  ✓ 12 expenses created');
      } else {
        console.log('  ✓ Expenses already exist');
      }

      // ─── DOCUMENTS ───
      const docExists = await client.query('SELECT COUNT(*) FROM documents WHERE project_id = $1', [pid]);
      if (parseInt(docExists.rows[0].count) === 0) {
        const docs = [
          ['Structural Drawing - Foundation', 'drawing', 'structural_foundation.pdf'],
          ['Architectural Plan - Ground Floor', 'drawing', 'arch_ground_floor.pdf'],
          ['BOQ - Bill of Quantities', 'estimate', 'boq_detailed.xlsx'],
          ['Soil Test Report', 'report', 'soil_test_report.pdf'],
          ['RERA Registration', 'legal', 'rera_certificate.pdf'],
          ['Building Permit', 'permit', 'building_permit.pdf'],
          ['Electrical Layout', 'drawing', 'electrical_layout.pdf'],
          ['Plumbing Layout', 'drawing', 'plumbing_layout.pdf'],
        ];
        for (const [name, type, filename] of docs) {
          await client.query(
            `INSERT INTO documents (id, name, type, file_url, description, project_id, company_id, uploaded_by, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [name, type, `/uploads/${filename}`, name, pid, cid, uid]
          );
        }
        console.log('  ✓ 8 documents created');
      } else {
        console.log('  ✓ Documents already exist');
      }

      // ─── CONSTRUCTION STAGES ───
      const stageExists = await client.query('SELECT COUNT(*) FROM construction_stages WHERE project_id = $1', [pid]);
      if (parseInt(stageExists.rows[0].count) === 0) {
        const stages = [
          ['Site Preparation', 'completed', 100, 1],
          ['Foundation Work', 'completed', 100, 2],
          ['Basement / Plinth', 'completed', 100, 3],
          ['Ground Floor Structure', 'completed', 100, 4],
          ['First Floor Structure', 'in_progress', 65, 5],
          ['Brickwork & Masonry', 'in_progress', 40, 6],
          ['Electrical & Plumbing', 'not_started', 0, 7],
          ['Plastering & Finishing', 'not_started', 0, 8],
          ['Painting & Flooring', 'not_started', 0, 9],
          ['Final Inspection', 'not_started', 0, 10],
        ];
        for (const [name, status, pct, order] of stages) {
          await client.query(
            `INSERT INTO construction_stages (id, stage_name, status, completion_percentage, stage_order, project_id, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
            [name, status, pct, order, pid]
          );
        }
        console.log('  ✓ 10 stages created');
      } else {
        console.log('  ✓ Stages already exist');
      }
    }

    console.log('\n✅ Seed completed!');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
