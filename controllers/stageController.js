const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getStages = async (req, res, next) => {
  try {
    const project_id = req.params.projectId || req.query.project_id;
    if (!project_id) return res.status(400).json({ message: 'project_id is required.' });
    const stages = await prisma.constructionStage.findMany({ where: { project_id }, orderBy: { stage_order: 'asc' } });
    res.json(stages.map(addId));
  } catch (error) { next(error); }
};

exports.updateStage = async (req, res, next) => {
  try {
    const { _id, ...data } = req.body;
    if (data.start_date) data.start_date = new Date(data.start_date);
    if (data.end_date) data.end_date = new Date(data.end_date);
    data.updated_by = req.user.userId;
    const stage = await prisma.constructionStage.update({ where: { id: req.params.id }, data });
    res.json(addId(stage));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Stage not found.' });
    next(error);
  }
};

exports.approveStage = async (req, res, next) => {
  try {
    const stage = await prisma.constructionStage.findUnique({ where: { id: req.params.id } });
    if (!stage) return res.status(404).json({ message: 'Stage not found.' });
    const approval = { approved: true, approved_by: req.user.userId, approved_at: new Date(), remarks: req.body.remarks || '' };
    const updated = await prisma.constructionStage.update({ where: { id: req.params.id }, data: { engineer_approval: approval } });
    res.json(addId(updated));
  } catch (error) { next(error); }
};

exports.getTimeline = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const stages = await prisma.constructionStage.findMany({ where: { project_id: projectId }, orderBy: { stage_order: 'asc' } });
    res.json(stages.map(addId));
  } catch (error) { next(error); }
};

