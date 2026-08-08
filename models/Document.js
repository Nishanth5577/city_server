const mongoose = require('mongoose');
const { DOCUMENT_TYPES } = require('../utils/constants');

const documentSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Document name is required'],
    trim: true,
    maxlength: 300,
  },
  type: {
    type: String,
    enum: DOCUMENT_TYPES,
    default: 'other',
  },
  file_url: {
    type: String,
    required: [true, 'File URL is required'],
  },
  file_size: {
    type: Number,
    default: 0,
  },
  mime_type: {
    type: String,
    default: '',
  },
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  access_roles: [{
    type: String,
    enum: ['admin', 'project_manager', 'engineer', 'supervisor', 'worker'],
  }],
  description: {
    type: String,
    maxlength: 500,
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

documentSchema.index({ project_id: 1 });
documentSchema.index({ company_id: 1 });

module.exports = mongoose.model('Document', documentSchema);
