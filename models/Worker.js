const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  worker_id: {
    type: String,
    unique: true,
    sparse: true,
  },
  name: {
    type: String,
    required: [true, 'Worker name is required'],
    trim: true,
    maxlength: 100,
  },
  skill: {
    type: String,
    trim: true,
    default: 'General',
  },
  specialization: {
    type: String,
    trim: true,
    default: '',
  },
  experience: {
    type: Number,
    default: 0,
    min: 0,
  },
  salary: {
    type: Number,
    default: 0,
    min: 0,
  },
  salary_type: {
    type: String,
    enum: ['daily', 'monthly'],
    default: 'daily',
  },
  availability: {
    type: String,
    enum: ['available', 'assigned', 'on_leave', 'inactive'],
    default: 'available',
  },
  assigned_project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  emergency_contact: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  aadhar_number: {
    type: String,
    trim: true,
    default: '',
  },
  bank_account: {
    type: String,
    trim: true,
    default: '',
  },
  ifsc_code: {
    type: String,
    trim: true,
    default: '',
  },
  joining_date: {
    type: Date,
    default: Date.now,
  },
  // Payroll tracking
  total_days_present: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_overtime_hours: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_earnings: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_advance: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_paid: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Productivity
  tasks_completed: {
    type: Number,
    default: 0,
    min: 0,
  },
  tasks_assigned: {
    type: Number,
    default: 0,
    min: 0,
  },
  productivity_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  performance_rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
}, {
  timestamps: true,
});

// Auto-generate worker_id
workerSchema.pre('save', async function(next) {
  if (!this.worker_id) {
    const count = await mongoose.model('Worker').countDocuments({ company_id: this.company_id });
    this.worker_id = `CC-WRK-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

workerSchema.index({ company_id: 1 });
workerSchema.index({ assigned_project: 1 });
workerSchema.index({ availability: 1 });

module.exports = mongoose.model('Worker', workerSchema);
