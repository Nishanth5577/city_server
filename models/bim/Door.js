const mongoose = require('mongoose');
const { DOOR_TYPES } = require('../../utils/bimConstants');

const doorSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  wall_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMWall', default: null },
  position: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  rotation: { type: Number, default: 0 },
  door_type: { type: String, enum: Object.values(DOOR_TYPES), default: DOOR_TYPES.SINGLE },
  width: { type: Number, default: 900 },
  height: { type: Number, default: 2100 },
  thickness: { type: Number, default: 40 },
  swing_direction: { type: String, enum: ['left', 'right', 'both', 'none'], default: 'left' },
  swing_angle: { type: Number, default: 90 },
  material: { type: String, default: 'wood' },
  frame_material: { type: String, default: 'wood' },
  color: { type: String, default: '#8B4513' },
  hardware: {
    handle_type: { type: String, default: 'lever' },
    lock_type: { type: String, default: 'mortise' },
    hinge_count: { type: Number, default: 3 },
    closer: { type: Boolean, default: false },
  },
  layer: { type: String, default: 'architectural' },
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  bim: {
    manufacturer: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    fire_rating: { type: String, default: 'none' },
    energy_rating: { type: String, default: '' },
    weight: { type: Number, default: 0 },
    warranty_years: { type: Number, default: 5 },
    installation_date: { type: Date, default: null },
    expected_life_years: { type: Number, default: 25 },
    supplier: { type: String, default: '' },
  },
  canvas_id: { type: String, default: '' },
}, { timestamps: true });

doorSchema.index({ floor_id: 1 });
doorSchema.index({ bim_project_id: 1 });
doorSchema.index({ wall_id: 1 });
module.exports = mongoose.model('BIMDoor', doorSchema);
