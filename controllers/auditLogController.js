const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { module, user_id, page = 1, limit = 50 } = req.query;
    const where = {};
    if (module) where.module = module;
    if (user_id) where.user_id = user_id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, skip, take, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs: logs.map(l => ({ ...l, _id: l.id, user_id: l.user ? { ...l.user, _id: l.user.id } : l.user_id })), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.createAuditLog = async (data) => {
  try {
    await prisma.auditLog.create({ data });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};
