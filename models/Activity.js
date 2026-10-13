const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'project_created', 'project_updated', 'project_deleted',
      'worker_added', 'worker_updated',
      'material_purchased', 'material_issued',
      'expense_added', 'expense_approved',
      'task_completed', 'task_created', 'task_updated',
      'document_uploaded', 'document_deleted',
      'payment_received', 'payment_made',
      'attendance_updated',
      'bim_updated',
      'general'
    ],
    default: 'general',
  },
  action: {
    type: String,
    required: true,
    maxlength: 500,
  },
  description: {
    type: String,
    maxlength: 1000,
    default: '',
  },
  module: {
    type: String,
    default: 'General',
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  user_name: {
    type: String,
    default: 'System',
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
  },
}, {
  timestamps: true,
});

activitySchema.index({ company_id: 1, createdAt: -1 });
activitySchema.index({ project_id: 1, createdAt: -1 });
activitySchema.index({ user_id: 1 });

module.exports = mongoose.model('Activity', activitySchema);
