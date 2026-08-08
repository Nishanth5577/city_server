const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  company_name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: 200,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  address: {
    street: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    zip: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
  contact: {
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
  },
  registration_details: {
    registration_number: { type: String, trim: true, default: '' },
    gst_number: { type: String, trim: true, default: '' },
    pan_number: { type: String, trim: true, default: '' },
  },
  logo: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

companySchema.index({ owner: 1 });

module.exports = mongoose.model('Company', companySchema);
