const mongoose = require('mongoose');
const { TASK_STATUS, TASK_PRIORITY } = require('../utils/constants');

const taskSchema = new mongoose.Schema({
  task_name: {
    type: String,
    required: [true, 'Task name is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 2000,
    default: '',
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  assigned_worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  priority: {
    type: String,
    enum: Object.values(TASK_PRIORITY),
    default: TASK_PRIORITY.MEDIUM,
  },
  start_date: {
    type: Date,
    default: null,
  },
  end_date: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: Object.values(TASK_STATUS),
    default: TASK_STATUS.PENDING,
  },
  completion_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  }],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

taskSchema.index({ project_id: 1 });
taskSchema.index({ assigned_worker: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model('Task', taskSchema);
