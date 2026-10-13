const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getNotifications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = { user_id: req.user.userId };
    if (status) where.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [notifications, total, unread] = await Promise.all([
      prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { user_id: req.user.userId, status: 'unread' } }),
    ]);
    res.json({ notifications: notifications.map(addId), total, unread, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { status: 'read' } });
    res.json({ message: 'Notification marked as read.' });
  } catch (error) { next(error); }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { user_id: req.user.userId, status: 'unread' }, data: { status: 'read' } });
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) { next(error); }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ message: 'Notification deleted.' });
  } catch (error) { next(error); }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.notification.count({ where: { user_id: req.user.userId, status: 'unread' } });
    res.json({ count });
  } catch (err) { next(err); }
};
