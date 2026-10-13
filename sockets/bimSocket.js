// ═══════════════════════════════════════════════════════════════
// BIM Real-Time Collaboration — Socket.io Namespace
// ═══════════════════════════════════════════════════════════════

// In-memory collaborator tracking (replaces MongoDB BIMCollaborator collection)
const activeCollaborators = new Map();

module.exports = function initBIMSockets(io) {
  const bimNamespace = io.of('/bim');

  bimNamespace.on('connection', (socket) => {
    console.log(`[BIM Socket] User connected: ${socket.id}`);

    // Join project room
    socket.on('bim:join_project', async ({ bim_project_id, user_id, user_name }) => {
      socket.join(`bim_${bim_project_id}`);
      socket.bimProjectId = bim_project_id;
      socket.userId = user_id;
      socket.userName = user_name;

      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF7F50', '#87CEEB'];
      const key = `${bim_project_id}:${user_id}`;
      const projectCollabs = [...activeCollaborators.values()].filter(c => c.bim_project_id === bim_project_id && c.is_online);
      activeCollaborators.set(key, {
        bim_project_id, user_id, user_name, is_online: true,
        socket_id: socket.id, color: colors[projectCollabs.length % colors.length],
        last_activity: new Date(),
      });

      socket.to(`bim_${bim_project_id}`).emit('bim:user_joined', {
        user_id, user_name, socket_id: socket.id,
      });

      console.log(`[BIM Socket] ${user_name} joined project ${bim_project_id}`);
    });

    // Leave project room
    socket.on('bim:leave_project', async () => {
      if (socket.bimProjectId) {
        socket.leave(`bim_${socket.bimProjectId}`);
        const key = `${socket.bimProjectId}:${socket.userId}`;
        const collab = activeCollaborators.get(key);
        if (collab) { collab.is_online = false; collab.socket_id = ''; }

        socket.to(`bim_${socket.bimProjectId}`).emit('bim:user_left', {
          user_id: socket.userId,
        });
      }
    });

    // Cursor movement (throttled on client)
    socket.on('bim:cursor_move', ({ x, y, active_floor_id }) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:cursor_moved', {
          user_id: socket.userId, user_name: socket.userName, x, y, active_floor_id,
        });
      }
    });

    // Element operations (broadcast to all collaborators)
    socket.on('bim:element_created', (data) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:element_created', { ...data, created_by: socket.userId });
      }
    });

    socket.on('bim:element_updated', (data) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:element_updated', { ...data, updated_by: socket.userId });
      }
    });

    socket.on('bim:element_deleted', (data) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:element_deleted', { ...data, deleted_by: socket.userId });
      }
    });

    // Canvas sync
    socket.on('bim:canvas_sync', (data) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:canvas_synced', { ...data, synced_by: socket.userId });
      }
    });

    // Selection lock
    socket.on('bim:element_locked', ({ element_id, element_type }) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:element_locked', {
          element_id, element_type, locked_by: socket.userId, locked_by_name: socket.userName,
        });
      }
    });

    socket.on('bim:element_unlocked', ({ element_id }) => {
      if (socket.bimProjectId) {
        socket.to(`bim_${socket.bimProjectId}`).emit('bim:element_unlocked', { element_id, unlocked_by: socket.userId });
      }
    });

    // Design comment notification
    socket.on('bim:comment_added', (data) => {
      if (socket.bimProjectId) {
        bimNamespace.to(`bim_${socket.bimProjectId}`).emit('bim:comment_added', {
          ...data, user_id: socket.userId, user_name: socket.userName,
        });
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', async () => {
      if (socket.bimProjectId && socket.userId) {
        const key = `${socket.bimProjectId}:${socket.userId}`;
        const collab = activeCollaborators.get(key);
        if (collab) { collab.is_online = false; collab.socket_id = ''; }

        socket.to(`bim_${socket.bimProjectId}`).emit('bim:user_left', { user_id: socket.userId });
      }
      console.log(`[BIM Socket] User disconnected: ${socket.id}`);
    });
  });

  return bimNamespace;
};
