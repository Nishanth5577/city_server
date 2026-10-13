const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getDPRs = async (req, res, next) => {
  try {
    const { project_id, start_date, end_date, page = 1, limit = 20 } = req.query;
    const where = {};
    if (project_id) where.project_id = project_id;
    if (start_date && end_date) where.date = { gte: new Date(start_date), lte: new Date(end_date) };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [reports, total] = await Promise.all([
      prisma.dailyProgressReport.findMany({ where, skip, take, include: { project: { select: { id: true, project_name: true } }, creator: { select: { id: true, name: true } } }, orderBy: { date: 'desc' } }),
      prisma.dailyProgressReport.count({ where }),
    ]);
    res.json({ reports: reports.map(r => ({ ...r, _id: r.id, project_id: r.project ? { ...r.project, _id: r.project.id } : r.project_id, created_by: r.creator ? { ...r.creator, _id: r.creator.id } : r.created_by })), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.getDPR = async (req, res, next) => {
  try {
    const report = await prisma.dailyProgressReport.findUnique({ where: { id: req.params.id }, include: { project: { select: { id: true, project_name: true } }, creator: { select: { id: true, name: true } } } });
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    res.json(addId(report));
  } catch (error) { next(error); }
};

exports.createDPR = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.userId };
    if (data.date) data.date = new Date(data.date);
    if (data.percentage) data.percentage = parseInt(data.percentage) || 0;
    if (data.workers_present) data.workers_present = parseInt(data.workers_present) || 0;
    if (data.materials_used && typeof data.materials_used === 'string') data.materials_used = JSON.parse(data.materials_used);
    if (data.equipment_used && typeof data.equipment_used === 'string') data.equipment_used = JSON.parse(data.equipment_used);
    if (data.weather && typeof data.weather === 'string') data.weather = JSON.parse(data.weather);

    // Map uploaded files to images array
    if (req.files && req.files.length > 0) {
      data.images = req.files.map((file, i) => ({
        url: `/uploads/${file.filename}`,
        caption: '',
        type: 'progress',
      }));
    } else if (data.images && typeof data.images === 'string') {
      data.images = JSON.parse(data.images);
    }

    delete data._id;
    const report = await prisma.dailyProgressReport.create({ data });
    res.status(201).json(addId(report));
  } catch (error) { next(error); }
};

exports.updateDPR = async (req, res, next) => {
  try {
    const { _id, ...data } = req.body;
    if (data.date) data.date = new Date(data.date);
    const report = await prisma.dailyProgressReport.update({ where: { id: req.params.id }, data });
    res.json(addId(report));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Report not found.' });
    next(error);
  }
};

exports.deleteDPR = async (req, res, next) => {
  try {
    await prisma.dailyProgressReport.delete({ where: { id: req.params.id } });
    res.json({ message: 'Report deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Report not found.' });
    next(error);
  }
};
