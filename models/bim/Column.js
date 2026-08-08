const mongoose = require('mongoose');
const { COLUMN_SHAPES } = require('../../utils/bimConstants');

const columnSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  position: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  shape: { type: String, enum: Object.values(COLUMN_SHAPES), default: COLUMN_SHAPES.RECTANGULAR },
  width: { type: Number, default: 300 },
  depth: { type: Number, default: 300 },
  diameter: { type: Number, default: 300 },
  height: { type: Number, default: 3000 },
  rotation: { type: Number, default: 0 },
  material: { type: String, default: 'rcc' },
  color: { type: String, default: '#A0A0A0' },
  reinforcement: {
    main_bars: { type: String, default: '8-16mm' },
    ties: { type: String, default: '8mm@150mm' },
    cover: { type: Number, default: 40 },
  },
  grade_concrete: { type: String, default: 'M25' },
  grade_steel: { type: String, default: 'Fe500' },
  load_capacity: { type: Number, default: 0 },
  layer: { type: String, default: 'structural' },
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  bim: {
    manufacturer: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    fire_rating: { type: String, default: '120min' },
    weight: { type: Number, default: 0 },
    installation_date: { type: Date, default: null },
    expected_life_years: { type: Number, default: 100 },
  },
  canvas_id: { type: String, default: '' },
}, { timestamps: true });

columnSchema.index({ floor_id: 1 });
columnSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMColumn', columnSchema);
