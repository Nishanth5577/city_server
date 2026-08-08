const mongoose = require('mongoose');
const { WINDOW_TYPES } = require('../../utils/bimConstants');

const windowSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  wall_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMWall', default: null },
  position: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  rotation: { type: Number, default: 0 },
  window_type: { type: String, enum: Object.values(WINDOW_TYPES), default: WINDOW_TYPES.CASEMENT },
  width: { type: Number, default: 1200 },
  height: { type: Number, default: 1200 },
  sill_height: { type: Number, default: 900 },
  glass_type: { type: String, enum: ['single', 'double', 'triple', 'laminated', 'tempered', 'tinted', 'low_e'], default: 'single' },
  frame_material: { type: String, enum: ['aluminium', 'upvc', 'wood', 'steel', 'fiberglass'], default: 'aluminium' },
  num_panels: { type: Number, default: 2 },
  openable: { type: Boolean, default: true },
  mosquito_mesh: { type: Boolean, default: true },
  grill: { type: Boolean, default: false },
  color: { type: String, default: '#87CEEB' },
  frame_color: { type: String, default: '#C0C0C0' },
  layer: { type: String, default: 'architectural' },
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  bim: {
    manufacturer: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    u_value: { type: Number, default: 0 },
    shgc: { type: Number, default: 0 },
    energy_rating: { type: String, default: '' },
    weight: { type: Number, default: 0 },
    warranty_years: { type: Number, default: 10 },
    installation_date: { type: Date, default: null },
    expected_life_years: { type: Number, default: 30 },
    supplier: { type: String, default: '' },
  },
  canvas_id: { type: String, default: '' },
}, { timestamps: true });

windowSchema.index({ floor_id: 1 });
windowSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMWindow', windowSchema);
