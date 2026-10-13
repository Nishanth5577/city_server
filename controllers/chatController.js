const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getMessages = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.query.receiver_id || req.query.receiver;
    const { project_id, page = 1, limit = 50 } = req.query;
    const where = {};
    if (project_id) where.project_id = project_id;
    if (targetUserId) {
      where.OR = [
        { sender_id: req.user.userId, receiver_id: targetUserId },
        { sender_id: targetUserId, receiver_id: req.user.userId },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [messages, total] = await Promise.all([
      prisma.message.findMany({ where, skip, take, include: { sender: { select: { id: true, name: true, profile_image: true } }, receiver: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
      prisma.message.count({ where }),
    ]);
    res.json({ messages: messages.map(m => ({ ...m, _id: m.id, sender_id: m.sender ? { ...m.sender, _id: m.sender.id } : m.sender_id })), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const data = { ...req.body, sender_id: req.user.userId };
    delete data._id;
    if (data.receiver && !data.receiver_id) {
      data.receiver_id = data.receiver;
    }
    delete data.receiver;
    if (data.project && !data.project_id) {
      data.project_id = data.project;
    }
    delete data.project;
    if (req.file) { data.attachment = `/uploads/${req.file.filename}`; data.att_name = req.file.originalname; data.att_type = req.file.mimetype; }
    const message = await prisma.message.create({ data, include: { sender: { select: { id: true, name: true, profile_image: true } } } });
    // Emit via socket
    if (global.io) global.io.emit('new_message', { ...message, _id: message.id });
    res.status(201).json(addId(message));
  } catch (error) { next(error); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await prisma.message.updateMany({ where: { sender_id: req.params.userId, receiver_id: req.user.userId, read: false }, data: { read: true } });
    res.json({ message: 'Messages marked as read.' });
  } catch (error) { next(error); }
};

exports.getChatUsers = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    where.id = { not: req.user.userId };
    const users = await prisma.user.findMany({ where, select: { id: true, name: true, email: true, role: true, profile_image: true, isActive: true }, orderBy: { name: 'asc' } });
    res.json(users.map(u => ({ ...u, _id: u.id })));
  } catch (error) { next(error); }
};

exports.getConversation = exports.getMessages;
exports.getConversations = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ where: { company_id: req.user.company_id, id: { not: req.user.userId } }, select: { id: true, name: true, email: true, role: true, profile_image: true } });
    res.json(users.map(u => ({ ...u, _id: u.id })));
  } catch (error) { next(error); }
};
exports.getUsers = exports.getChatUsers;
