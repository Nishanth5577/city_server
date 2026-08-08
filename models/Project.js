const mongoose = require('mongoose');
const { PROJECT_STATUS } = require('../utils/constants');

const projectSchema = new mongoose.Schema({
  project_id: {
    type: String,
    unique: true,
    sparse: true,
  },
  project_name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: 200,
  },
  client_name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    maxlength: 200,
  },
  client_phone: {
    type: String,
    trim: true,
    default: '',
  },
  client_email: {
    type: String,
    trim: true,
    default: '',
  },
  site_address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
  },
  location: {
    type: String,
    trim: true,
    maxlength: 300,
    default: '',
  },
  description: {
    type: String,
    maxlength: 2000,
    default: '',
  },
  start_date: {
    type: Date,
    default: null,
  },
  expected_end_date: {
    type: Date,
    default: null,
  },
  actual_end_date: {
    type: Date,
    default: null,
  },
  contract_value: {
    type: Number,
    default: 0,
    min: 0,
  },
  budget: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_expenses: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_income: {
    type: Number,
    default: 0,
    min: 0,
  },
  payment_pending: {
    type: Number,
    default: 0,
    min: 0,
  },
  project_status: {
    type: String,
    enum: Object.values(PROJECT_STATUS),
    default: PROJECT_STATUS.PLANNING,
  },
  progress_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  risk_level: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },
  manager_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  qr_code: {
    type: String,
    default: null,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  health_score: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
}, {
  timestamps: true,
});

// Auto-generate project_id
projectSchema.pre('save', async function(next) {
  if (!this.project_id) {
    const count = await mongoose.model('Project').countDocuments();
    const rand = Math.floor(Math.random() * 900) + 100;
    this.project_id = `CC-PRJ-${String(count + 1).padStart(4, '0')}-${rand}`;
  }
  next();
});

projectSchema.index({ company_id: 1 });
projectSchema.index({ project_status: 1 });
projectSchema.index({ manager_id: 1 });
projectSchema.index({ created_by: 1 });

module.exports = mongoose.model('Project', projectSchema);
