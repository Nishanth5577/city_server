const mongoose = require('mongoose');

const designHistorySchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', default: null },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

  // Action Details
  action_type: {
    type: String,
    enum: ['create', 'update', 'delete', 'move', 'rotate', 'resize', 'material_change',
           'duplicate', 'group', 'ungroup', 'lock', 'unlock', 'hide', 'show',
           'floor_add', 'floor_delete', 'building_add', 'canvas_save', 'batch_update'],
    required: true,
  },
  element_type: { type: String, default: null },
  element_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  element_name: { type: String, default: '' },

  // State Snapshots
  before_state: { type: mongoose.Schema.Types.Mixed, default: null },
  after_state: { type: mongoose.Schema.Types.Mixed, default: null },

  // Description
  description: { type: String, default: '' },
  batch_id: { type: String, default: null }, // Group related actions

  // Metadata
  ip_address: { type: String, default: '' },
  user_agent: { type: String, default: '' },
}, { timestamps: true });

designHistorySchema.index({ bim_project_id: 1, createdAt: -1 });
designHistorySchema.index({ floor_id: 1 });
designHistorySchema.index({ user_id: 1 });
designHistorySchema.index({ action_type: 1 });
designHistorySchema.index({ batch_id: 1 });

module.exports = mongoose.model('BIMDesignHistory', designHistorySchema);
