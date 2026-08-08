const mongoose = require('mongoose');
const { STAIR_TYPES } = require('../../utils/bimConstants');

const stairSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  position: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  rotation: { type: Number, default: 0 },
  stair_type: { type: String, enum: Object.values(STAIR_TYPES), default: STAIR_TYPES.STRAIGHT },
  width: { type: Number, default: 1200 },
  total_height: { type: Number, default: 3000 },
  num_risers: { type: Number, default: 18 },
  riser_height: { type: Number, default: 167 },
  tread_depth: { type: Number, default: 270 },
  landing_width: { type: Number, default: 1200 },
  landing_length: { type: Number, default: 1200 },
  direction: { type: String, enum: ['up', 'down'], default: 'up' },
  handrail: { left: { type: Boolean, default: true }, right: { type: Boolean, default: true }, height: { type: Number, default: 900 }, material: { type: String, default: 'steel' } },
  nosing: { type: Number, default: 25 },
  material: { type: String, default: 'rcc' },
  finish: { type: String, default: 'granite' },
  color: { type: String, default: '#B0B0B0' },
  anti_slip: { type: Boolean, default: true },
  layer: { type: String, default: 'architectural' },
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  bim: {
    manufacturer: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    fire_rating: { type: String, default: '120min' },
    weight: { type: Number, default: 0 },
    installation_date: { type: Date, default: null },
    expected_life_years: { type: Number, default: 50 },
  },
  canvas_id: { type: String, default: '' },
}, { timestamps: true });

stairSchema.index({ floor_id: 1 });
stairSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMStair', stairSchema);
