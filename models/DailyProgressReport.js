const mongoose = require('mongoose');

const dailyProgressReportSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  description: {
    type: String,
    maxlength: 3000,
    default: '',
  },
  completed_work: {
    type: String,
    maxlength: 3000,
    default: '',
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  workers_present: {
    type: Number,
    default: 0,
    min: 0,
  },
  materials_used: [{
    material: { type: String },
    quantity: { type: Number },
    unit: { type: String },
  }],
  equipment_used: [{
    equipment: { type: String },
    hours: { type: Number },
  }],
  problems: {
    type: String,
    maxlength: 2000,
    default: '',
  },
  images: [{
    url: { type: String },
    caption: { type: String, default: '' },
    type: {
      type: String,
      enum: ['before', 'after', 'progress'],
      default: 'progress',
    },
  }],
  weather: {
    condition: { type: String, default: '' },
    temperature: { type: Number, default: null },
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

dailyProgressReportSchema.index({ project_id: 1, date: -1 });

module.exports = mongoose.model('DailyProgressReport', dailyProgressReportSchema);
