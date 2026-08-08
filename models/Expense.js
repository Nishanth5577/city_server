const mongoose = require('mongoose');
const { EXPENSE_CATEGORIES, APPROVAL_STATUS } = require('../utils/constants');

const expenseSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  category: {
    type: String,
    enum: EXPENSE_CATEGORIES,
    required: [true, 'Category is required'],
  },
  description: {
    type: String,
    maxlength: 1000,
    default: '',
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  approved_status: {
    type: String,
    enum: Object.values(APPROVAL_STATUS),
    default: APPROVAL_STATUS.PENDING,
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  receipt_image: {
    type: String,
    default: null,
  },
  created_by: {
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

expenseSchema.index({ project_id: 1 });
expenseSchema.index({ company_id: 1 });
expenseSchema.index({ approved_status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
