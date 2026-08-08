const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { user_id, module, action, start_date, end_date, page = 1, limit = 50 } = req.query;
    const query = {};
    if (user_id) query.user_id = user_id;
    if (module) query.module = module;
    if (action) query.action = { $regex: action, $options: 'i' };
    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) query.createdAt.$gte = new Date(start_date);
      if (end_date) query.createdAt.$lte = new Date(end_date);
    }

    const logs = await AuditLog.find(query)
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));
    const total = await AuditLog.countDocuments(query);
    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};
