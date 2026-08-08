const mongoose = require('mongoose');
const { EQUIPMENT_AVAILABILITY } = require('../utils/constants');

const maintenanceLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  type: { type: String, enum: ['preventive', 'corrective', 'inspection'], default: 'preventive' },
  description: { type: String, maxlength: 500, default: '' },
  cost: { type: Number, default: 0, min: 0 },
  performed_by: { type: String, default: '' },
  next_due: { type: Date, default: null },
});

const usageLogSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, default: null },
  hours_used: { type: Number, default: 0, min: 0 },
  operator: { type: String, default: '' },
  fuel_consumed: { type: Number, default: 0, min: 0 },
  notes: { type: String, maxlength: 500, default: '' },
});

const equipmentSchema = new mongoose.Schema({
  equipment_name: {
    type: String,
    required: [true, 'Equipment name is required'],
    trim: true,
    maxlength: 200,
  },
  type: {
    type: String,
    trim: true,
    default: 'General',
  },
  model_number: {
    type: String,
    trim: true,
    default: '',
  },
  serial_number: {
    type: String,
    trim: true,
    default: '',
  },
  purchase_date: {
    type: Date,
    default: null,
  },
  purchase_cost: {
    type: Number,
    default: 0,
    min: 0,
  },
  assigned_project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  operator: {
    type: String,
    trim: true,
    default: '',
  },
  availability: {
    type: String,
    enum: Object.values(EQUIPMENT_AVAILABILITY),
    default: EQUIPMENT_AVAILABILITY.AVAILABLE,
  },
  maintenance_date: {
    type: Date,
    default: null,
  },
  next_maintenance: {
    type: Date,
    default: null,
  },
  maintenance_interval_days: {
    type: Number,
    default: 90,
    min: 1,
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good',
  },
  cost_per_day: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_hours_used: {
    type: Number,
    default: 0,
    min: 0,
  },
  maintenance_logs: [maintenanceLogSchema],
  usage_logs: [usageLogSchema],
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
}, {
  timestamps: true,
});

equipmentSchema.index({ company_id: 1 });
equipmentSchema.index({ assigned_project: 1 });
equipmentSchema.index({ next_maintenance: 1 });

module.exports = mongoose.model('Equipment', equipmentSchema);
