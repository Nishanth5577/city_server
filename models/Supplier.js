const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  company_name: {
    type: String,
    required: [true, 'Supplier company name is required'],
    trim: true,
    maxlength: 200,
  },
  contact_person: {
    type: String,
    trim: true,
    maxlength: 100,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
  },
  materials_supplied: [{
    type: String,
    trim: true,
  }],
  gst_number: {
    type: String,
    trim: true,
    default: '',
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  total_orders: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_amount_paid: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_amount_pending: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active',
  },
  notes: {
    type: String,
    maxlength: 2000,
    default: '',
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
}, {
  timestamps: true,
});

supplierSchema.index({ company_id: 1 });
supplierSchema.index({ status: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
