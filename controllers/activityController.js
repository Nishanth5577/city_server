const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getActivities = async (req, res, next) => {
  try {
    const { project_id, module, page = 1, limit = 30 } = req.query;
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    if (project_id) where.project_id = project_id;
    if (module) where.module = module;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [activities, total] = await Promise.all([
      prisma.activity.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.activity.count({ where }),
    ]);
    res.json({ activities: activities.map(addId), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.createActivity = async (req, res, next) => {
  try {
    const data = { ...req.body, user_id: req.user.userId, user_name: req.user.name, company_id: req.user.company_id };
    delete data._id;
    const activity = await prisma.activity.create({ data });
    res.status(201).json(addId(activity));
  } catch (error) { next(error); }
};
