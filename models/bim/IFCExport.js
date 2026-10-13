const mongoose = require('mongoose');

const ifcExportSchema = new mongoose.Schema({
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  file_name: { type: String, required: true },
  file_path: { type: String, default: '' },
  file_size: { type: Number, default: 0 },
  ifc_version: { type: String, enum: ['IFC2x3', 'IFC4', 'IFC4.3'], default: 'IFC4' },
  export_type: { type: String, enum: ['full', 'floor', 'elements', 'structural', 'mep'], default: 'full' },
  entity_count: { type: Number, default: 0 },
  export_config: {
    include_furniture: { type: Boolean, default: true },
    include_mep: { type: Boolean, default: true },
    include_structural: { type: Boolean, default: true },
    include_rooms: { type: Boolean, default: true },
    include_property_sets: { type: Boolean, default: true },
    include_quantities: { type: Boolean, default: true },
    coordinate_system: { type: String, default: 'local' },
  },
  validation_results: {
    is_valid: { type: Boolean, default: null },
    errors: [{ type: String }],
    warnings: [{ type: String }],
    checked_at: { type: Date, default: null },
  },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  error_message: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

ifcExportSchema.index({ bim_project_id: 1, createdAt: -1 });
ifcExportSchema.index({ company_id: 1 });

module.exports = mongoose.model('BIMIFCExport', ifcExportSchema);
