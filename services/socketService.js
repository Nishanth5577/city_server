const jwt = require('jsonwebtoken');

const setupSocket = (io) => {
  // Auth middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId}`);

    // Join user-specific room for targeted notifications
    socket.join(`user_${socket.userId}`);

    // Explicit room join from client
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
    });

    // Join company room
    socket.on('join_company', (companyId) => {
      if (companyId) socket.join(`company_${companyId}`);
    });

    // Join project rooms
    socket.on('join_project', (projectId) => {
      socket.join(`project_${projectId}`);
      console.log(`User ${socket.userId} joined project room: ${projectId}`);
    });

    socket.on('leave_project', (projectId) => {
      socket.leave(`project_${projectId}`);
    });

    // Real-time chat
    socket.on('chat_message', (data) => {
      io.to(`user_${data.receiver}`).emit('chat_message', {
        ...data,
        sender: socket.userId,
        timestamp: new Date(),
      });
    });

    // Real-time typing indicator
    socket.on('typing', (data) => {
      socket.to(`user_${data.receiver}`).emit('typing', {
        sender: socket.userId,
        isTyping: data.isTyping,
      });
    });

    // Progress updates
    socket.on('progress_update', (data) => {
      io.to(`project_${data.projectId}`).emit('progress_update', data);
    });

    // ═══════════════ BIM COLLABORATION ═══════════════

    // Join BIM design session
    socket.on('bim:join_session', (data) => {
      const room = `bim_${data.bim_project_id}`;
      socket.join(room);
      socket.bimProjectId = data.bim_project_id;
      socket.bimFloorId = data.active_floor_id;
      socket.to(room).emit('bim:user_joined', {
        user_id: socket.userId,
        name: data.name,
        color: data.color,
        active_floor_id: data.active_floor_id,
      });
      console.log(`🏗️ User ${socket.userId} joined BIM session: ${data.bim_project_id}`);
    });

    // Leave BIM session
    socket.on('bim:leave_session', () => {
      if (socket.bimProjectId) {
        const room = `bim_${socket.bimProjectId}`;
        socket.to(room).emit('bim:user_left', { user_id: socket.userId });
        socket.leave(room);
      }
    });

    // Live cursor broadcast
    socket.on('bim:cursor_move', (data) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:cursor_moved', {
          user_id: socket.userId,
          x: data.x,
          y: data.y,
          active_floor_id: data.active_floor_id,
          name: data.name,
          color: data.color,
        });
      }
    });

    // Element selected/locked by user
    socket.on('bim:element_lock', (data) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:element_locked', {
          user_id: socket.userId,
          element_id: data.element_id,
          element_type: data.element_type,
          name: data.name,
          color: data.color,
        });
      }
    });

    // Element unlocked
    socket.on('bim:element_unlock', (data) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:element_unlocked', {
          user_id: socket.userId,
          element_id: data.element_id,
        });
      }
    });

    // Design change broadcast (wall added, room modified, etc.)
    socket.on('bim:design_change', (data) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:design_changed', {
          user_id: socket.userId,
          change_type: data.change_type, // 'add', 'update', 'delete'
          element_type: data.element_type,
          element_id: data.element_id,
          element_data: data.element_data,
          name: data.name,
          timestamp: new Date(),
        });
      }
    });

    // Layer visibility toggle sync
    socket.on('bim:layer_toggle', (data) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:layer_toggled', {
          user_id: socket.userId,
          layer: data.layer,
          visible: data.visible,
          name: data.name,
        });
      }
    });

    // Floor switch notification
    socket.on('bim:floor_switch', (data) => {
      if (socket.bimProjectId) {
        socket.bimFloorId = data.floor_id;
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:floor_switched', {
          user_id: socket.userId,
          floor_id: data.floor_id,
          floor_name: data.floor_name,
          name: data.name,
        });
      }
    });

    // Disconnect — cleanup BIM session
    socket.on('disconnect', () => {
      if (socket.bimProjectId) {
        io.to(`bim_${socket.bimProjectId}`).emit('bim:user_left', { user_id: socket.userId });
      }
      console.log(`🔌 User disconnected: ${socket.userId}`);
    });
  });
};

module.exports = setupSocket;
