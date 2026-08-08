const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  start: { type: Date, required: true },
  end: { type: Date },
  all_day: { type: Boolean, default: false },
  type: { type: String, enum: ['meeting', 'deadline', 'holiday', 'reminder', 'milestone', 'other'], default: 'other' },
  color: { type: String, default: '#3b82f6' },
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

calendarEventSchema.index({ company_id: 1, start: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
