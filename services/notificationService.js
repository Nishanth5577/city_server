const prisma = require('../config/prisma');

const createNotification = async ({ user_id, message, type, link, metadata }) => {
  try {
    const notification = await prisma.notification.create({
      data: { user_id, message, type, link, metadata: metadata || {} },
    });
    if (global.io) {
      global.io.to(`user_${user_id}`).emit('notification', { ...notification, _id: notification.id });
    }
    return { ...notification, _id: notification.id };
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

const broadcastToRole = async (companyId, role, { message, type, link }) => {
  try {
    const users = await prisma.user.findMany({ where: { company_id: companyId, role } });
    const notifications = await Promise.all(
      users.map(u => createNotification({ user_id: u.id, message, type, link }))
    );
    return notifications.filter(Boolean);
  } catch (error) {
    console.error('Broadcast failed:', error.message);
    return [];
  }
};

module.exports = { createNotification, broadcastToRole };
