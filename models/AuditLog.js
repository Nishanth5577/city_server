const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  user_name: {
    type: String,
    default: '',
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
  },
  module: {
    type: String,
    required: [true, 'Module is required'],
    trim: true,
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  old_value: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  new_value: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  ip_address: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

auditLogSchema.index({ user_id: 1 });
auditLogSchema.index({ module: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
