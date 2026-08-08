const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  worker_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'overtime', 'leave'],
    default: 'present',
  },
  check_in: {
    type: String,
    default: '',
  },
  check_out: {
    type: String,
    default: '',
  },
  hours_worked: {
    type: Number,
    default: 8,
    min: 0,
  },
  overtime_hours: {
    type: Number,
    default: 0,
    min: 0,
  },
  daily_wage: {
    type: Number,
    default: 0,
    min: 0,
  },
  notes: {
    type: String,
    maxlength: 500,
    default: '',
  },
  marked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
}, {
  timestamps: true,
});

attendanceSchema.index({ worker_id: 1, date: 1 }, { unique: true });
attendanceSchema.index({ project_id: 1, date: 1 });
attendanceSchema.index({ company_id: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
