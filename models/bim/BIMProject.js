const mongoose = require('mongoose');

const bimProjectSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  design_name: { type: String, required: true, trim: true, maxlength: 300 },
  description: { type: String, maxlength: 2000, default: '' },
  status: { type: String, enum: ['draft', 'in_progress', 'review', 'approved', 'archived'], default: 'draft' },
  site_data: {
    total_area: { type: Number, default: 0 },
    built_up_area: { type: Number, default: 0 },
    carpet_area: { type: Number, default: 0 },
    fsi: { type: Number, default: 0 },
    plot_dimensions: { length: { type: Number, default: 0 }, width: { type: Number, default: 0 } },
    setbacks: { front: { type: Number, default: 0 }, rear: { type: Number, default: 0 }, left: { type: Number, default: 0 }, right: { type: Number, default: 0 } },
    orientation: { type: String, enum: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'], default: 'north' },
  },
  coordinate_system: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
  grid_spacing: { type: Number, default: 100 },
  snap_enabled: { type: Boolean, default: true },
  buildings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BIMBuilding' }],
  canvas_settings: {
    width: { type: Number, default: 4000 },
    height: { type: Number, default: 3000 },
    zoom: { type: Number, default: 1 },
    pan_x: { type: Number, default: 0 },
    pan_y: { type: Number, default: 0 },
  },
  layer_visibility: {
    architectural: { type: Boolean, default: true },
    structural: { type: Boolean, default: true },
    electrical: { type: Boolean, default: false },
    plumbing: { type: Boolean, default: false },
    hvac: { type: Boolean, default: false },
    furniture: { type: Boolean, default: true },
    landscape: { type: Boolean, default: true },
    dimensions: { type: Boolean, default: true },
    grid: { type: Boolean, default: true },
    annotations: { type: Boolean, default: true },
  },
  collaborators: [{ user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' }, added_at: { type: Date, default: Date.now } }],
  version: { type: Number, default: 1 },
  thumbnail: { type: String, default: null },
  tags: [String],
  is_template: { type: Boolean, default: false },
}, { timestamps: true });

bimProjectSchema.index({ project_id: 1 });
bimProjectSchema.index({ company_id: 1 });
bimProjectSchema.index({ created_by: 1 });
bimProjectSchema.index({ status: 1 });

module.exports = mongoose.model('BIMProject', bimProjectSchema);
