const Notification = require('../models/Notification');

const createNotification = async ({ user_id, message, type, link, metadata }) => {
  try {
    const notification = await Notification.create({ user_id, message, type, link, metadata });
    // If socket.io instance is available, emit in real-time
    if (global.io) {
      global.io.to(`user_${user_id}`).emit('notification', notification);
    }
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

const broadcastToRole = async (companyId, role, { message, type, link }) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ company_id: companyId, role });
    const notifications = await Promise.all(
      users.map(u => createNotification({ user_id: u._id, message, type, link }))
    );
    return notifications.filter(Boolean);
  } catch (error) {
    console.error('Broadcast failed:', error.message);
    return [];
  }
};

module.exports = { createNotification, broadcastToRole };
