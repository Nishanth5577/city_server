const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
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
  payment_mode: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'other'],
    default: 'bank_transfer',
  },
  reference_number: {
    type: String,
    trim: true,
    default: '',
  },
  party_name: {
    type: String,
    trim: true,
    default: '',
  },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null,
  },
  receipt_url: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed',
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

paymentSchema.index({ project_id: 1 });
paymentSchema.index({ company_id: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ date: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
