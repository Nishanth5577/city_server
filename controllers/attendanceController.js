const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getAttendance = async (req, res, next) => {
  try {
    const { project_id, worker_id, date, start_date, end_date, page = 1, limit = 50 } = req.query;
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    if (project_id) where.project_id = project_id;
    if (worker_id) where.worker_id = worker_id;
    if (date) where.date = new Date(date);
    if (start_date && end_date) where.date = { gte: new Date(start_date), lte: new Date(end_date) };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({ where, skip, take, include: { worker: { select: { id: true, name: true, skill: true } }, project: { select: { id: true, project_name: true } } }, orderBy: { date: 'desc' } }),
      prisma.attendance.count({ where }),
    ]);
    res.json({ attendance: attendance.map(a => ({ ...a, _id: a.id, worker_id: a.worker ? { ...a.worker, _id: a.worker.id } : a.worker_id, project_id: a.project ? { ...a.project, _id: a.project.id } : a.project_id })), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const data = { ...req.body, marked_by: req.user.userId, company_id: req.user.company_id };
    if (data.date) data.date = new Date(data.date);
    else data.date = new Date();
    delete data._id;
    delete data.id;

    // Ensure project_id exists
    if (!data.project_id) {
      const firstProject = await prisma.project.findFirst({
        where: { company_id: req.user.company_id },
        select: { id: true },
      });
      data.project_id = firstProject?.id;
    }
    if (!data.project_id) {
      return res.status(400).json({ message: 'No project found. Please select a project.' });
    }

    // Only keep valid fields
    const allowed = ['worker_id', 'project_id', 'date', 'status', 'check_in', 'check_out', 'hours_worked', 'overtime_hours', 'daily_wage', 'notes', 'marked_by', 'company_id'];
    const cleanData = {};
    for (const key of allowed) {
      if (data[key] !== undefined) cleanData[key] = data[key];
    }

    // Upsert
    const existing = await prisma.attendance.findFirst({ where: { worker_id: cleanData.worker_id, date: cleanData.date } });
    let record;
    if (existing) {
      record = await prisma.attendance.update({ where: { id: existing.id }, data: cleanData });
    } else {
      record = await prisma.attendance.create({ data: cleanData });
    }
    res.status(201).json(addId(record));
  } catch (error) { next(error); }
};

exports.bulkMarkAttendance = async (req, res, next) => {
  try {
    const { records, project_id, date: bulkDate } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No attendance records provided' });
    }

    // Resolve project_id — use provided one, or find worker's assigned project, or first project
    let resolvedProjectId = project_id;
    if (!resolvedProjectId) {
      const firstProject = await prisma.project.findFirst({
        where: { company_id: req.user.company_id },
        select: { id: true },
      });
      resolvedProjectId = firstProject?.id;
    }
    if (!resolvedProjectId) {
      return res.status(400).json({ message: 'No project found. Please select a project or create one first.' });
    }

    const dateVal = bulkDate ? new Date(bulkDate) : new Date();
    const results = [];

    for (const rec of records) {
      const data = {
        worker_id: rec.worker_id,
        project_id: rec.project_id || resolvedProjectId,
        status: rec.status || 'present',
        daily_wage: rec.daily_wage || 0,
        hours_worked: rec.hours_worked || 8,
        overtime_hours: rec.overtime_hours || 0,
        notes: rec.notes || '',
        marked_by: req.user.userId,
        company_id: req.user.company_id,
        date: rec.date ? new Date(rec.date) : dateVal,
      };

      const existing = await prisma.attendance.findFirst({
        where: { worker_id: data.worker_id, date: data.date },
      });

      if (existing) {
        results.push(await prisma.attendance.update({ where: { id: existing.id }, data }));
      } else {
        results.push(await prisma.attendance.create({ data }));
      }
    }
    res.status(201).json(results.map(addId));
  } catch (error) { next(error); }
};

exports.getAttendanceSummary = async (req, res, next) => {
  try {
    const { project_id, start_date, end_date } = req.query;
    const where = {};
    if (project_id) where.project_id = project_id;
    if (start_date && end_date) where.date = { gte: new Date(start_date), lte: new Date(end_date) };
    const records = await prisma.attendance.findMany({ where, include: { worker: { select: { id: true, name: true, skill: true } } } });
    // Group by worker
    const summary = {};
    records.forEach(r => {
      if (!summary[r.worker_id]) summary[r.worker_id] = { worker: r.worker, present: 0, absent: 0, half_day: 0, overtime: 0, total_hours: 0, total_wage: 0 };
      summary[r.worker_id][r.status] = (summary[r.worker_id][r.status] || 0) + 1;
      summary[r.worker_id].total_hours += r.hours_worked || 0;
      summary[r.worker_id].total_wage += r.daily_wage || 0;
    });
    res.json(Object.values(summary));
  } catch (error) { next(error); }
};

exports.markBulkAttendance = exports.bulkMarkAttendance;
exports.getWorkerAttendanceSummary = exports.getAttendanceSummary;
