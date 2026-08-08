const Message = require('../models/Message');
const User = require('../models/User');

exports.getUsers = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;
    const users = await User.find({ ...query, _id: { $ne: req.user.userId } })
      .select('name email role profile_image')
      .sort({ name: 1 });
    res.json(users);
  } catch (error) { next(error); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { receiver, project_id, message } = req.body;
    const msgData = {
      sender: req.user.userId,
      receiver,
      project_id: project_id || null,
      message,
    };

    if (req.file) {
      msgData.attachment = {
        url: `/uploads/${req.file.filename}`,
        name: req.file.originalname,
        type: req.file.mimetype,
      };
    }

    const msg = await Message.create(msgData);
    const populated = await Message.findById(msg._id)
      .populate('sender', 'name profile_image')
      .populate('receiver', 'name profile_image');

    // Emit via Socket.io
    if (global.io) {
      global.io.to(`user_${receiver}`).emit('chat_message', populated);
    }

    res.status(201).json(populated);
  } catch (error) { next(error); }
};

exports.getConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { project_id, page = 1, limit = 50 } = req.query;
    const query = {
      $or: [
        { sender: req.user.userId, receiver: userId },
        { sender: userId, receiver: req.user.userId },
      ],
    };
    if (project_id) query.project_id = project_id;

    const messages = await Message.find(query)
      .populate('sender', 'name profile_image')
      .populate('receiver', 'name profile_image')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));

    // Mark as read
    await Message.updateMany(
      { sender: userId, receiver: req.user.userId, read: false },
      { read: true }
    );

    res.json({ messages: messages.reverse(), page: parseInt(page) });
  } catch (error) { next(error); }
};

exports.getConversations = async (req, res, next) => {
  try {
    // Get unique conversation partners
    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: require('mongoose').Types.ObjectId.createFromHexString(req.user.userId) }, { receiver: require('mongoose').Types.ObjectId.createFromHexString(req.user.userId) }] } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', require('mongoose').Types.ObjectId.createFromHexString(req.user.userId)] },
            '$receiver',
            '$sender',
          ],
        },
        lastMessage: { $first: '$message' },
        lastMessageAt: { $first: '$createdAt' },
        unread: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$receiver', require('mongoose').Types.ObjectId.createFromHexString(req.user.userId)] },
                { $eq: ['$read', false] },
              ]},
              1, 0,
            ],
          },
        },
      }},
      { $sort: { lastMessageAt: -1 } },
    ]);

    // Populate user details
    const userIds = conversations.map(c => c._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email profile_image role');
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const result = conversations.map(c => ({
      user: userMap[c._id.toString()],
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unread: c.unread,
    }));

    res.json(result);
  } catch (error) { next(error); }
};
