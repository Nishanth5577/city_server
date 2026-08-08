const mongoose = require('mongoose');
const { PLUMBING_ELEMENT_TYPES } = require('../../utils/bimConstants');

const plumbingElementSchema = new mongoose.Schema({
  floor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMFloor', required: true },
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMRoom', default: null },
  bim_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMProject', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  element_type: { type: String, enum: Object.values(PLUMBING_ELEMENT_TYPES), required: true },
  position: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  rotation: { type: Number, default: 0 },
  pipe_diameter: { type: Number, default: 0 },
  pipe_material: { type: String, enum: ['cpvc', 'upvc', 'pprc', 'gi', 'copper', 'hdpe', 'pvc'], default: 'cpvc' },
  flow_type: { type: String, enum: ['hot_water', 'cold_water', 'drainage', 'sewage', 'rainwater', 'gas'], default: 'cold_water' },
  pressure_rating: { type: Number, default: 0 },
  route_points: [{ x: Number, y: Number }],
  connected_to: { type: mongoose.Schema.Types.ObjectId, ref: 'BIMPlumbingElement', default: null },
  slope: { type: Number, default: 0 },
  capacity_liters: { type: Number, default: 0 },
  color: { type: String, default: '#4169E1' },
  layer: { type: String, default: 'plumbing' },
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  bim: {
    manufacturer: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    warranty_years: { type: Number, default: 5 },
    supplier: { type: String, default: '' },
    installation_date: { type: Date, default: null },
    expected_life_years: { type: Number, default: 25 },
  },
  canvas_id: { type: String, default: '' },
}, { timestamps: true });

plumbingElementSchema.index({ floor_id: 1 });
plumbingElementSchema.index({ bim_project_id: 1 });
module.exports = mongoose.model('BIMPlumbingElement', plumbingElementSchema);
