const mongoose = require('mongoose');

const beamSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  start_point: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  end_point: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  width: { type: Number, default: 230 },
  depth: { type: Number, default: 450 },
  beam_type: { type: String, enum: ['main', 'secondary', 'tie', 'plinth', 'lintel', 'grade'], default: 'main' },
  material: { type: String, default: 'rcc' },
  color: { type: String, default: '#909090' },
  span: { type: Number, default: 0 },
  reinforcement: {
    top_bars: { type: String, default: '2-16mm' },
    bottom_bars: { type: String, default: '3-16mm' },
    stirrups: { type: String, default: '8mm@150mm' },
    cover: { type: Number, default: 25 },
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

beamSchema.index({ floor_id: 1 });
beamSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMBeam', beamSchema);
