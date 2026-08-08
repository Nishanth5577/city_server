const mongoose = require('mongoose');

const materialTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['purchase', 'issue', 'return', 'adjustment'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit_price: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null,
  },
  issued_to: {
    type: String,
    trim: true,
    default: '',
  },
  invoice_number: {
    type: String,
    trim: true,
    default: '',
  },
  notes: {
    type: String,
    maxlength: 500,
    default: '',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

const materialSchema = new mongoose.Schema({
  material_name: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true,
    maxlength: 200,
  },
  category: {
    type: String,
    trim: true,
    default: 'General',
  },
  supplier: {
    type: String,
    trim: true,
    default: '',
  },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null,
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  unit: {
    type: String,
    trim: true,
    default: 'units',
  },
  available_stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  used_stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  cost: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_purchased: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_issued: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_returned: {
    type: Number,
    default: 0,
    min: 0,
  },
  low_stock_threshold: {
    type: Number,
    default: 10,
    min: 0,
  },
  transactions: [materialTransactionSchema],
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
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

materialSchema.index({ project_id: 1 });
materialSchema.index({ company_id: 1 });

module.exports = mongoose.model('Material', materialSchema);
