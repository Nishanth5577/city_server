const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getWorkers = async (req, res, next) => {
  try {
    const { project_id, skill, availability, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    if (project_id) where.assigned_project_id = project_id;
    if (skill) where.skill = skill;
    if (availability) where.availability = availability;
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { skill: { contains: search, mode: 'insensitive' } }];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [workers, total] = await Promise.all([
      prisma.worker.findMany({ where, skip, take, include: { assigned_project: { select: { id: true, project_name: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.worker.count({ where }),
    ]);
    res.json({ workers: workers.map(w => ({ ...w, _id: w.id, assigned_project: w.assigned_project ? { ...w.assigned_project, _id: w.assigned_project.id } : null })), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.getWorker = async (req, res, next) => {
  try {
    const worker = await prisma.worker.findUnique({ where: { id: req.params.id }, include: { assigned_project: { select: { id: true, project_name: true } } } });
    if (!worker) return res.status(404).json({ message: 'Worker not found.' });
    res.json(addId(worker));
  } catch (error) { next(error); }
};

exports.createWorker = async (req, res, next) => {
  try {
    const { assigned_project, ...data } = req.body;
    data.company_id = req.user.company_id;
    if (assigned_project) data.assigned_project_id = assigned_project;
    if (data.joining_date) data.joining_date = new Date(data.joining_date);
    const count = await prisma.worker.count();
    data.worker_id = `CC-WRK-${String(count + 1).padStart(4, '0')}`;
    const worker = await prisma.worker.create({ data });
    res.status(201).json(addId(worker));
  } catch (error) { next(error); }
};

exports.updateWorker = async (req, res, next) => {
  try {
    const { _id, assigned_project, ...data } = req.body;
    if (assigned_project) data.assigned_project_id = assigned_project;
    if (data.joining_date) data.joining_date = new Date(data.joining_date);
    const worker = await prisma.worker.update({ where: { id: req.params.id }, data });
    res.json(addId(worker));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Worker not found.' });
    next(error);
  }
};

exports.deleteWorker = async (req, res, next) => {
  try {
    await prisma.worker.delete({ where: { id: req.params.id } });
    res.json({ message: 'Worker deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Worker not found.' });
    next(error);
  }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const data = { ...req.body, worker_id: req.params.id, marked_by: req.user.userId, company_id: req.user.company_id };
    if (data.date) data.date = new Date(data.date);
    delete data._id;
    const record = await prisma.attendance.create({ data });
    res.status(201).json({ ...record, _id: record.id });
  } catch (error) { next(error); }
};

exports.getProductivity = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const worker = await prisma.worker.findUnique({ where: { id: req.params.id } });
    if (!worker) return res.status(404).json({ message: 'Worker not found.' });
    res.json({ worker_id: worker.id, name: worker.name, productivity_score: worker.productivity_score || 0, total_days_present: worker.total_days_present || 0, total_earnings: worker.total_earnings || 0 });
  } catch (error) { next(error); }
};
