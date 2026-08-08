const AuditLog = require('../models/AuditLog');

/**
 * Middleware factory to automatically create audit logs for mutations.
 * Usage: auditLog('projects', 'Updated project')
 */
const auditLog = (module, action) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Only log successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        AuditLog.create({
          user_id: req.user.userId,
          user_name: req.user.name,
          action: action || `${req.method} ${req.originalUrl}`,
          module,
          entity_id: req.params.id || data?._id || null,
          old_value: req._auditOldValue || null,
          new_value: req.body || null,
          ip_address: req.ip || req.connection?.remoteAddress || '',
        }).catch(err => console.error('Audit log error:', err.message));
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = auditLog;
