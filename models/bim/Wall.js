const mongoose = require('mongoose');
const { WALL_TYPES } = require('../../utils/bimConstants');

const wallSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  wall_type: { type: String, enum: Object.values(WALL_TYPES), default: WALL_TYPES.INTERIOR },
  start_point: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  end_point: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  thickness: { type: Number, default: 230 },
  height: { type: Number, default: 3000 },
  material: { type: String, default: 'brick' },
  color: { type: String, default: '#8B7355' },
  openings: [{
    type: { type: String, enum: ['door', 'window'] },
    element_id: { type: mongoose.Schema.Types.ObjectId },
    position: { type: Number },
    width: { type: Number },
    height: { type: Number },
    sill_height: { type: Number, default: 0 },
  }],
  is_structural: { type: Boolean, default: false },
  layer: { type: String, default: 'architectural' },
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  bim: {
    manufacturer: { type: String, default: '' },
    cost_per_sqm: { type: Number, default: 0 },
    fire_rating: { type: String, default: 'none' },
    thermal_rating: { type: Number, default: 0 },
    sound_rating: { type: Number, default: 0 },
    weight_per_sqm: { type: Number, default: 0 },
    installation_date: { type: Date, default: null },
    expected_life_years: { type: Number, default: 50 },
    warranty_years: { type: Number, default: 0 },
  },
  canvas_id: { type: String, default: '' },
}, { timestamps: true });

wallSchema.index({ floor_id: 1 });
wallSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMWall', wallSchema);
