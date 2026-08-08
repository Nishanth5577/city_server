const mongoose = require('mongoose');
const { CONSTRUCTION_STAGES, STAGE_STATUS } = require('../utils/constants');

const constructionStageSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  stage_name: {
    type: String,
    enum: CONSTRUCTION_STAGES,
    required: true,
  },
  stage_order: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(STAGE_STATUS),
    default: STAGE_STATUS.NOT_STARTED,
  },
  completion_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  start_date: {
    type: Date,
    default: null,
  },
  end_date: {
    type: Date,
    default: null,
  },
  estimated_cost: {
    type: Number,
    default: 0,
    min: 0,
  },
  actual_cost: {
    type: Number,
    default: 0,
    min: 0,
  },
  assigned_workers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
  }],
  required_materials: [{
    material_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
    material_name: { type: String, default: '' },
    quantity_needed: { type: Number, default: 0 },
    quantity_used: { type: Number, default: 0 },
  }],
  photos: [{
    url: { type: String, required: true },
    caption: { type: String, default: '' },
    phase: { type: String, enum: ['before', 'during', 'after'], default: 'during' },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploaded_at: { type: Date, default: Date.now },
  }],
  engineer_approval: {
    approved: { type: Boolean, default: false },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
    remarks: { type: String, default: '' },
  },
  notes: {
    type: String,
    maxlength: 1000,
    default: '',
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

constructionStageSchema.index({ project_id: 1, stage_order: 1 });

module.exports = mongoose.model('ConstructionStage', constructionStageSchema);
