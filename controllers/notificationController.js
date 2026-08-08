const Notification = require('../models/Notification');

exports.getNotifications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const query = { user_id: req.user.userId };
    if (status) query.status = status;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user_id: req.user.userId, status: 'unread' });

    res.json({ notifications, total, unreadCount, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.userId },
      { status: 'read' },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    res.json(notification);
  } catch (error) { next(error); }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user_id: req.user.userId, status: 'unread' },
      { status: 'read' }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) { next(error); }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user_id: req.user.userId });
    res.json({ message: 'Notification deleted.' });
  } catch (error) { next(error); }
};
